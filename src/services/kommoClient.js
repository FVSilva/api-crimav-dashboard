import axios from "axios";
import https from "https";

const DOMAIN = process.env.KOMMO_DOMAIN;
const TOKEN = `Bearer ${process.env.KOMMO_TOKEN}`;

const httpsAgent = new https.Agent({
  keepAlive: true,
});

export async function safeGet(path, params = {}) {
  const url = `${DOMAIN}${path}`;

  const res = await axios.get(url, {
    headers: {
      Authorization: TOKEN,
      Accept: "application/json",
    },
    params,
    httpsAgent,
  });

  return res.data;
}