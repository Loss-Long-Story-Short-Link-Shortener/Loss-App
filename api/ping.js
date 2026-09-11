export default function handler(request, response) {
  response.status(200).json({ ok: true, service: "api" });
}

export const config = { runtime: "nodejs20.x" };
