import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8080",
  withCredentials: true,
});

// 이메일 인증 코드 요청(스텁)
export const requestEmailCode = async (email) => {
  // TODO: 백엔드 붙으면 실제 엔드포인트로 교체
  console.log("requestEmailCode", email);
  return { data: { ok: true } };
};

// 이메일 코드 검증(스텁)
export const verifyEmailCode = async ({ email, code }) => {
  console.log("verifyEmailCode", email, code);
  return { data: { ok: true } };
};

// 최종 회원가입(스텁)
export const register = async (payload) => {
  console.log("register payload", payload);
  // return api.post("/api/auth/register", payload);
  return { data: { ok: true, id: 1 } };
};
