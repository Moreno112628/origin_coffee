const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const publicDirectory = path.resolve(__dirname, "..", "frontend");
const maximumBodySize = 10 * 1024;
const contactRequests = [];

const products = [
  {
    id: "narino",
    name: "Nariño",
    region: "Sur de Colombia",
    profile: "Notas dulces, cuerpo medio y acidez brillante.",
    variety: "Caturra · Castillo",
    color: "terracotta",
  },
  {
    id: "huila",
    name: "Huila",
    region: "Cordillera de los Andes",
    profile: "Aromas frutales, balance y final delicado.",
    variety: "Café de origen",
    color: "olive",
  },
  {
    id: "house",
    name: "Selección de la casa",
    region: "Cosechas colombianas",
    profile: "Una taza amable para disfrutar todos los días.",
    variety: "Mezcla de temporada",
    color: "coffee",
  },
];

class RequestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const declaredSize = Number(request.headers["content-length"] || 0);
  if (declaredSize > maximumBodySize) {
    request.resume();
    throw new RequestError("El formulario supera el tamaño permitido.", 413);
  }

  const chunks = [];
  let totalSize = 0;
  for await (const chunk of request) {
    totalSize += chunk.length;
    if (totalSize > maximumBodySize) {
      throw new RequestError("El formulario supera el tamaño permitido.", 413);
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new RequestError("El contenido enviado no es JSON válido.", 400);
    }
    throw error;
  }
}

function validateContact(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Completa los datos del formulario.";
  }

  const { name, email, message } = payload;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return "Completa los datos del formulario.";
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMessage = message.trim();
  if (!cleanName || cleanName.length > 100) {
    return "El nombre es obligatorio y debe tener máximo 100 caracteres.";
  }
  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return "Ingresa un correo electrónico válido.";
  }
  if (!cleanMessage || cleanMessage.length > 2000) {
    return "El mensaje es obligatorio y debe tener máximo 2000 caracteres.";
  }

  return null;
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  return types[extension] || "application/octet-stream";
}

async function serveStaticFile(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDirectory, `.${requestedPath}`);
  const relativePath = path.relative(publicDirectory, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    sendJson(response, 404, { error: "No se encontró la página solicitada." });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "No se encontró la página solicitada." });
      return;
    }
    throw error;
  }
}

async function handleRequest(request, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch (error) {
    if (error instanceof URIError) {
      sendJson(response, 400, { error: "La ruta solicitada no es válida." });
      return;
    }
    throw error;
  }

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && pathname === "/api/products") {
    sendJson(response, 200, { products });
    return;
  }

  if (request.method === "POST" && pathname === "/api/contact") {
    if (!request.headers["content-type"]?.includes("application/json")) {
      sendJson(response, 415, {
        error: "Envía el formulario con contenido JSON.",
      });
      return;
    }

    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.statusCode, { error: error.message });
        return;
      }
      throw error;
    }

    const validationError = validateContact(payload);
    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return;
    }

    contactRequests.push({
      name: payload.name.trim(),
      email: payload.email.trim(),
      message: payload.message.trim(),
      receivedAt: new Date().toISOString(),
    });
    sendJson(response, 202, {
      message:
        "Solicitud recibida en esta demostración. No se envió por correo y se perderá al detener el servidor.",
    });
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStaticFile(request, response, pathname);
    return;
  }

  sendJson(response, 405, { error: "Método no permitido." });
}

function createServer() {
  return http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      console.error("Error al procesar la solicitud:", error);
      if (!response.headersSent) {
        sendJson(response, 500, {
          error: "Ocurrió un error interno. Intenta de nuevo más tarde.",
        });
      } else {
        response.destroy(error);
      }
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT debe ser un número entero entre 1 y 65535.");
  }

  createServer().listen(port, () => {
    console.log(`Origin Coffee está disponible en http://localhost:${port}`);
  });
}

module.exports = { createServer, products };
