import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const dir = "D:\\TCC Founders Club Automation\\scripts";

http.createServer((req, res) => {
  const file = path.join(dir, req.url === "/" ? "first-post.html" : req.url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
}).listen(4173, () => console.log("Serving on http://localhost:4173"));
