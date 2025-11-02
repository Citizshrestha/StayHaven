import { create, find, findByIdAndUpdate } from '../models/waitercall.schema';

// Create a new waiter call
export async function createWaiterCall(req, res) {
  try {
    const { roomNumber } = req.body;
    const call = await create({ roomNumber });
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get all active calls
export async function getActiveCalls(req, res) {
  try {
    const calls = await find({ status: 'Active' });
    res.json({ success: true, data: calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Mark call as handled
export async function handleCall(req, res) {
  try {
    const call = await findByIdAndUpdate(
      req.params.id,
      { status: 'Handled' },
      { new: true }
    );
    res.json({ success: true, data: call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
