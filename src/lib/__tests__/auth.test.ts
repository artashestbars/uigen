// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify, decodeProtectedHeader } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockGet,
    set: mockSet,
    delete: vi.fn(),
  }),
}));

import { createSession, getSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function signToken(
  payload: object,
  secret = JWT_SECRET,
  expiresIn = "7d"
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("sets an httpOnly cookie", async () => {
    await createSession("user-1", "user@example.com");
    expect(mockSet).toHaveBeenCalledOnce();
    const [name, , options] = mockSet.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.sameSite).toBe("lax");
  });

  test("cookie contains a valid JWT with correct claims", async () => {
    await createSession("user-1", "user@example.com");
    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
  });

  test("cookie expiry is approximately 7 days from now", async () => {
    await createSession("user-1", "user@example.com");
    const [, , options] = mockSet.mock.calls[0];
    const diff = options.expires.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(diff).toBeGreaterThan(sevenDaysMs - 5000);
    expect(diff).toBeLessThanOrEqual(sevenDaysMs);
  });

  test("JWT uses HS256 algorithm and includes iat claim", async () => {
    await createSession("user-1", "user@example.com");
    const [, token] = mockSet.mock.calls[0];
    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe("HS256");
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.iat).toBeTypeOf("number");
  });

  test("JWT exp matches the cookie expiry (7-day window)", async () => {
    await createSession("user-1", "user@example.com");
    const [, token, options] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const jwtExpMs = (payload.exp as number) * 1000;
    expect(Math.abs(jwtExpMs - options.expires.getTime())).toBeLessThan(5000);
  });

  test("cookie secure flag is false outside production", async () => {
    await createSession("user-1", "user@example.com");
    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("cookie secure flag is true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-1", "user@example.com");
    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  test("token signed with wrong secret fails verification", async () => {
    await createSession("user-1", "user@example.com");
    const [, token] = mockSet.mock.calls[0];
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    await expect(jwtVerify(token, wrongSecret)).rejects.toThrow();
  });

  test("JWT payload includes expiresAt matching the cookie expiry", async () => {
    await createSession("user-1", "user@example.com");
    const [, token, options] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const payloadExpiresAt = new Date(payload.expiresAt as string).getTime();
    expect(Math.abs(payloadExpiresAt - options.expires.getTime())).toBeLessThan(5000);
  });

  test("each call sets exactly one cookie per invocation", async () => {
    await createSession("a", "a@a.com");
    await createSession("b", "b@b.com");
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet.mock.calls[1][0]).toBe("auth-token");
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns SessionPayload with correct userId and email", async () => {
    const token = await signToken({ userId: "u1", email: "u@e.com", expiresAt: new Date() });
    mockGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session?.userId).toBe("u1");
    expect(session?.email).toBe("u@e.com");
  });

  test("returns null for a malformed token string", async () => {
    mockGet.mockReturnValue({ value: "not.a.valid.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await signToken({ userId: "u1", email: "u@e.com" }, wrongSecret);
    mockGet.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await signToken(
      { userId: "u1", email: "u@e.com" },
      JWT_SECRET,
      new Date(Date.now() - 1000)
    );
    mockGet.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("reads the auth-token cookie by name", async () => {
    mockGet.mockReturnValue(undefined);
    await getSession();
    expect(mockGet).toHaveBeenCalledWith("auth-token");
  });
});
