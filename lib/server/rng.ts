import { randomBytes } from "crypto";
import type { Rng } from "../engine";

/** Crypto-backed Rng for production gameplay randomness (coin flips, shuffles). */
export const secureRng: Rng = () => randomBytes(4).readUInt32BE(0) / 2 ** 32;
