import { app } from "./app.js";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT phải từ 1 đến 65535.");
const server = app.listen(port, host, () =>
  console.log(`Crypto Lab: http://${host}:${port}`),
);
server.on("error", (error) => {
  console.error(`Không thể khởi động máy chủ (${error.code}).`);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
