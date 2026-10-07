import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

test('signup, reset, sessions, and socket isolation reject privilege bypasses', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { User } = await import('../models/user.schema.js');
    const { OTP } = await import('../models/otp.schema.js');
    const { Role } = await import('../models/role.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Message } = await import('../models/message.schema.js');
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    const auth = await import('../controllers/authController.js');
    const { generateAccessToken, generateRefreshToken } = await import('../utils/tokenUtils.js');
    const { authenticateSocket, authorizeSocketPacket, canJoinHotel } = await import('../config/socketSecurity.js');
    const { deepSanitize } = await import('../middleware/sanitization.js');
    const fixture = await walletFixtures();
    const previousSecret = process.env.JWT_ACCESS_SECRET;
    const previousRefreshSecret = process.env.JWT_REFRESH_SECRET;
    process.env.JWT_ACCESS_SECRET = 'security-integration-secret-never-for-production';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET;
    const call = async (handler, body = {}, cookies = {}) => {
      let status = 200, payload, error;
      const issuedCookies = {};
      await handler({ body, cookies, query: {}, headers: {} }, {
        status(code) { status = code; return this; }, json(data) { payload = data; return this; },
        cookie(name, value) { issuedCookies[name] = value; return this; },
      }, err => { error = err; });
      if (error) throw error;
      return { status, payload, cookies: issuedCookies };
    };
    try {
      const password = '  Crystal<Peak>92!  ';
      assert.equal(deepSanitize({ password }).password, password, 'password bytes must not be stripped or trimmed');
      const pending = await OTP.create({ email: 'signup-security@example.test', otp: '583920', type: 'signup', expiresAt: new Date(Date.now() + 600000), signupFormData: { fullname: 'Signup Guest', username: 'signup-security', password } });
      const hash = pending.signupFormData.password;
      assert.equal((await call(auth.verifySignupOtp, { userId: pending.email, otp: '111111' })).status, 400);
      const failed = await OTP.findById(pending._id);
      assert.equal(failed.attempts, 1, 'wrong signup codes count toward lockout');
      assert.equal(failed.signupFormData.password, hash, 'attempt updates must not rehash the stored password');
      const lockout = await OTP.create({ email: 'lockout@example.test', otp: '197246', type: 'signup', expiresAt: new Date(Date.now() + 600000) });
      await Promise.all(Array.from({ length: 5 }, async () => (await OTP.findById(lockout._id)).incrementAttempts()));
      assert.equal((await OTP.findById(lockout._id)).attempts, 5, 'concurrent failed guesses must each count toward lockout');
      assert.equal((await call(auth.verifySignupOtp, { userId: pending.email, otp: '583920' })).status, 200);
      const user = await User.findOne({ email: pending.email });
      assert.equal(await user.matchPassword(password), true, 'verified signup must hash the password exactly once');
      assert.equal((await call(auth.verifySignupOtp, { userId: pending.email, otp: '583920' })).status, 404);
      const login = await call(auth.loginUser, { email: pending.email, password });
      assert.equal(login.status, 200);
      const oldRefresh = login.cookies.refreshToken;
      assert.equal((await call(auth.refreshAccessToken, {}, { refreshToken: login.payload.accessToken })).status, 401);
      const rotations = await Promise.all([1, 2].map(() => call(auth.refreshAccessToken, {}, { refreshToken: oldRefresh })));
      assert.equal(rotations.filter(result => result.status === 200).length, 1, 'refresh tokens may only be rotated once, including concurrent requests');
      const refreshed = rotations.find(result => result.status === 200);
      assert.equal(refreshed.status, 200);
      assert.notEqual(refreshed.cookies.refreshToken, oldRefresh, 'rotation is unique even within the same second');
      assert.notEqual((await call(auth.refreshAccessToken, {}, { refreshToken: oldRefresh })).status, 200);
      await OTP.create({ email: user.email, otp: '746295', type: 'password-reset', expiresAt: new Date(Date.now() + 600000) });
      assert.equal((await call(auth.verifyResetPasswordOtp, { userId: 'malformed', otp: '746295' })).status, 400);
      const verified = await call(auth.verifyResetPasswordOtp, { userId: String(user._id), otp: '746295' });
      assert.equal(verified.status, 200);
      assert.match(verified.payload.resetToken, /^[a-f0-9]{64}$/);
      const newPassword = 'DifferentPeak95!';
      const resetBody = { userId: String(user._id), newPassword };
      assert.equal((await call(auth.resetPassword, resetBody)).status, 400, 'knowing a verified user ID is not reset proof');
      assert.equal((await call(auth.resetPassword, { ...resetBody, resetToken: 'a'.repeat(64) })).status, 400);
      const resets = await Promise.all([1, 2].map(() => call(auth.resetPassword, { ...resetBody, resetToken: verified.payload.resetToken })));
      assert.deepEqual(resets.map(r => r.status).sort(), [200, 400], 'reset proof is atomically single use');
      assert.equal(await (await User.findById(user._id)).matchPassword(newPassword), true);
      assert.notEqual((await call(auth.refreshAccessToken, {}, { refreshToken: refreshed.cookies.refreshToken })).status, 200, 'reset revokes prior refresh sessions');

      const staffRole = await Role.create({ name: 'waiter' });
      const worker = await User.create({ fullname: 'Socket Worker', username: 'socket-worker', email: 'socket-worker@example.test', password: 'SamplePeak59!', role: staffRole._id, company: fixture.company, assignedProperties: [fixture.hotel._id], accountStatus: 'active' });
      const socket = { handshake: { auth: { token: generateAccessToken(worker._id) } } };
      await authenticateSocket(socket);
      const hotelId = String(fixture.hotel._id);
      assert.equal(await canJoinHotel(socket, hotelId), true);
      assert.equal(await canJoinHotel(socket, 'malformed'), false);
      assert.equal(await authorizeSocketPacket({}, ['join-role', { userId: String(user._id), role: 'superadmin' }]), false);
      assert.equal(await authorizeSocketPacket(socket, ['join-role', null]), false);
      const packet = ['join-role', { userId: String(user._id), role: 'superadmin', hotelId }];
      assert.equal(await authorizeSocketPacket(socket, packet), true);
      assert.equal(packet[1].userId, String(worker._id));
      assert.equal(packet[1].role, 'waiter');
      const unrelatedHotel = await Hotel.create({ company: fixture.company, owner: fixture.user._id, name: 'Unassigned Hotel', description: 'Security fixture', category: 'Hotel', starRating: 3, location: { city: 'Kathmandu', country: 'Nepal', address: 'Other street' }, contact: { phone: '9800000002', email: 'unassigned@example.test' }, images: ['https://security-tests.invalid/hotel.jpg'], priceRange: { min: 1000, max: 1000 } });
      assert.equal(await canJoinHotel(socket, String(unrelatedHotel._id)), false, 'same company does not override property assignment');
      const fakeAdmin = { authUser: { ...socket.authUser, role: 'admin', companyId: String(user._id) } };
      assert.equal(await canJoinHotel(fakeAdmin, hotelId), false, 'company admin is not platform admin');
      const callRecord = await Message.create({ hotel: fixture.hotel._id, sender: worker._id, recipient: user._id, channel: 'direct', content: 'Call', messageType: 'call_request' });
      assert.equal(await authorizeSocketPacket(socket, ['webrtc-offer', { hotelId, callId: String(callRecord._id), targetUserId: String(fixture.user._id) }]), false, 'signaling cannot be sent to arbitrary users');
      assert.equal(await authorizeSocketPacket(socket, ['webrtc-offer', { hotelId, callId: String(callRecord._id), targetUserId: String(user._id) }]), true);
      await assert.rejects(authenticateSocket({ handshake: { auth: { token: generateRefreshToken(worker._id) } } }));
      await assert.rejects(authenticateSocket({ handshake: { auth: { token: jwt.sign({ id: String(worker._id) }, process.env.JWT_ACCESS_SECRET) } } }));
      await assert.rejects(authenticateSocket({ handshake: { auth: { token: jwt.sign({ id: String(worker._id), type: 'access' }, process.env.JWT_ACCESS_SECRET) } } }));
      worker.isActive = false;
      await worker.save();
      await assert.rejects(authenticateSocket({ handshake: { auth: { token: generateAccessToken(worker._id) } } }));
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previousSecret;
      if (previousRefreshSecret === undefined) delete process.env.JWT_REFRESH_SECRET; else process.env.JWT_REFRESH_SECRET = previousRefreshSecret;
    }
  });
});
