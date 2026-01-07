// src/polyfills.ts
import { Buffer } from "buffer";
import process from "process";

// 전역에 주입
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (!globalThis.Buffer) globalThis.Buffer = Buffer;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (!globalThis.process) globalThis.process = process;
