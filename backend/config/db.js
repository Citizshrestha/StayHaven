import mongoose from "mongoose";
import dns from "dns";
import tls from "node:tls";
import { createLogger } from "../utils/logger.js";

const logger = createLogger('Database');

// UDP DNS can be unavailable on restricted networks. Keep resolver overrides
// opt-in; forcing public UDP resolvers made Atlas unreachable on such hosts.
if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(",").map(value => value.trim()).filter(Boolean));
}

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DNS_NAME = /^(?=.{1,253}$)[a-z0-9_.-]+$/i;

const queryDnsOverHttps = async (name, type) => {
    if (!DNS_NAME.test(name)) throw new Error("Invalid DNS name");
    const url = new URL(DOH_ENDPOINT);
    url.search = new URLSearchParams({ name, type }).toString();
    const response = await fetch(url, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("DNS-over-HTTPS request failed");
    const payload = await response.json();
    if (payload?.Status !== 0 || !Array.isArray(payload.Answer)) {
        throw new Error("DNS-over-HTTPS lookup failed");
    }
    return payload.Answer;
};

const resolveSrvUriOverHttps = async (uri) => {
    const parsed = new URL(uri);
    const records = await queryDnsOverHttps(`_mongodb._tcp.${parsed.hostname}`, "SRV");
    const hosts = records
        .filter(record => record.type === 33 && typeof record.data === "string")
        .map(record => {
            const parts = record.data.trim().split(/\s+/);
            const port = Number(parts[2]);
            const host = parts[3]?.replace(/\.$/, "");
            if (!host || !DNS_NAME.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
            return `${host}:${port}`;
        })
        .filter(Boolean);
    if (!hosts.length) throw new Error("MongoDB Atlas SRV records were not found");

    const params = new URLSearchParams(parsed.search);
    try {
        const txtRecords = await queryDnsOverHttps(parsed.hostname, "TXT");
        for (const record of txtRecords.filter(record => record.type === 16 && typeof record.data === "string")) {
            const text = record.data.replace(/^"|"$/g, "").replace(/"\s+"/g, "");
            for (const [key, value] of new URLSearchParams(text)) {
                if (["authSource", "replicaSet", "loadBalanced"].includes(key) && !params.has(key)) params.set(key, value);
            }
        }
    } catch {
        // Atlas TXT options are optional; the SRV hosts remain authoritative.
    }
    params.set("tls", "true");
    const credentials = parsed.username
        ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
        : "";
    return `mongodb://${credentials}${hosts.join(",")}${parsed.pathname}?${params.toString()}`;
};

const dohLookup = (hostname, options, callback) => {
    const settings = typeof options === "object" ? options : { family: options };
    const family = Number(settings?.family) || 0;
    const types = family === 6 ? [["AAAA", 28, 6]] : family === 4 ? [["A", 1, 4]] : [["A", 1, 4], ["AAAA", 28, 6]];
    Promise.all(types.map(async ([type, recordType, addressFamily]) =>
        (await queryDnsOverHttps(hostname, type))
            .filter(record => record.type === recordType && typeof record.data === "string")
            .map(record => ({ address: record.data, family: addressFamily }))))
        .then(groups => groups.flat())
        .then(addresses => {
            if (!addresses.length) throw new Error("Host address was not found");
            if (settings?.all) callback(null, addresses);
            else callback(null, addresses[0].address, addresses[0].family);
        })
        .catch(error => callback(error));
};

// Node ships its own CA bundle and, by default, does not include certificates
// trusted through the Windows certificate store. Corporate antivirus/proxies
// can re-sign Atlas TLS traffic with a locally trusted CA, which otherwise
// surfaces as Mongoose's misleading Atlas allowlist error. Merge the Windows
// store into Node's defaults when the runtime supports the system-CA API.
if (
    process.platform === "win32" &&
    typeof tls.getCACertificates === "function" &&
    typeof tls.setDefaultCACertificates === "function"
) {
    const defaultCAs = tls.getCACertificates("default");
    const systemCAs = tls.getCACertificates("system");

    if (systemCAs.length > 0) {
        tls.setDefaultCACertificates([...new Set([...defaultCAs, ...systemCAs])]);
        logger.info("Windows system certificates added to Node.js TLS trust store");
    }
}

const connectDB = async () => {
    const isProduction = process.env.NODE_ENV === "production";

    try {
        if (!process.env.MONGODB_URI) {
            logger.error("MONGODB_URI is not defined in the .env file");
            if (isProduction) {
                throw new Error("MONGODB_URI is required in production");
            }

            logger.warn("Starting backend without MongoDB connection (development mode)");
            return false;
        }

        const useDoh = process.env.MONGODB_DOH_FALLBACK === "true" && process.env.MONGODB_URI.startsWith("mongodb+srv://");
        const connectionUri = useDoh
            ? await resolveSrvUriOverHttps(process.env.MONGODB_URI)
            : process.env.MONGODB_URI;
        await mongoose.connect(connectionUri, {
            serverSelectionTimeoutMS: 10000, // 10 seconds timeout for initial connection
            socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
            ...(useDoh ? { lookup: dohLookup } : {}),
        });

        // Set default query timeout for all queries
        mongoose.set('maxTimeMS', 10000); // 10 seconds for all queries

        logger.info("MongoDB Connected Successfully");

        // Intentionally not awaited: seeding must not delay server startup.
        // It therefore needs its own catch, otherwise any rejection becomes an
        // unhandled promise rejection that can terminate the process on Node 15+.
        // Seeding is strict opt-in via ENABLE_DEMO_SEED and always refuses in
        // production -- see utils/bootstrapDemoData.js.
        const { bootstrapDemoData } = await import("../utils/bootstrapDemoData.js");
        bootstrapDemoData().catch(error => {
            logger.error("Demo data bootstrap rejected", { message: error?.message });
        });

        return true;
    } catch (error) {
        logger.error("MongoDB Connection Failed", { message: error.message, stack: error.stack });

        if (isProduction) {
            throw error;
        }

        logger.warn("Continuing without MongoDB (development mode)");
        return false;
    }
}

export default connectDB;
