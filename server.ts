import "zone.js/dist/zone-node";
import { ngExpressEngine } from "@nguniversal/express-engine";
import * as express from "express";
import { join, resolve } from "path";
import fetch from "node-fetch"; // ⚠️ cần: npm i node-fetch
import { APP_BASE_HREF } from "@angular/common";
import { AppServerModule } from "./src/main.server";
import * as dotenv from "dotenv";
dotenv.config();

// ---------- ⚙️ TẠO APP EXPRESS ----------
export function app(): express.Express {
  const server = express();
  const serverDistFolder = __dirname;
  const distFolder = resolve(serverDistFolder, "../browser");
  const indexHtml = join(serverDistFolder, "index.server.html");

  // SSR engine
  server.engine(
    "html",
    ngExpressEngine({
      bootstrap: AppServerModule,
    })
  );

  server.set("view engine", "html");
  server.set("views", distFolder);

  // ---------- 🚀 STATIC ----------
  server.get("*.*", express.static(distFolder, { maxAge: "1y" }));

  // ---------- 🧠 STATIC META MAP ----------
  const staticMeta = {
    "/home": {
      title: "Home Page | Dynamic Title and Meta Tags Demo",
      description:
        "Game of Thrones Quotes: Winter is Coming, You know nothing Jon Snow...",
      image: "https://yourdomain.com/assets/image/homepage.png",
      url: "https://yourdomain.com/home",
    },
    "/characters": {
      title: "GOT Characters 🧔",
      description: "List of all the characters from Game of Thrones.",
      image: "https://yourdomain.com/assets/image/characters.png",
      url: "https://yourdomain.com/characters",
    },
    "/books": {
      title: "GOT Books 📚",
      description:
        "List of all Game of Thrones books: A Game of Thrones, Clash of Kings...",
      image: "https://yourdomain.com/assets/image/books.png",
      url: "https://yourdomain.com/books",
    },
  };

  server.get("/api/characters/:slug", (req, res) => {
    const data = {
      url: "https://www.anapioficeandfire.com/api/characters/561",
      name: "Jeyne Westerling",
      gender: "Female",
      culture: "Westerman",
      born: "In 283 AC, at the Crag",
      titles: ["Queen", "Lady of Winterfell"],
      books: [
        "https://www.anapioficeandfire.com/api/books/3",
        "https://www.anapioficeandfire.com/api/books/5",
      ],
      spouse: "https://www.anapioficeandfire.com/api/characters/1880",
    };
    res.json(data);
  });

  // ---------- 🧩 SSR ROUTE ----------
  server.get("*", async (req, res) => {
    const path = req.url.split("?")[0];
    let seo = staticMeta["/home"]; // fallback

    // ✅ Nếu là /characters/:id → call API async
    const characterDetailMatch = path.match(/^\/characters\/([^/]+)$/);
    if (characterDetailMatch) {
      const slug = characterDetailMatch[1];
      try {
        // 🧠 Call API (mock ví dụ, bạn thay API thật của bạn)
        const apiRes = await fetch(
          `${process.env.API_URL}/api/characters/${slug}`
        );
        const character = await apiRes.json();

        console.log(character);

        seo = {
          title: `${character.name} - GOT Character 🧠`,
          description: character.bio || `Profile of ${character.name}`,
          image: "https://picsum.photos/200/300",
          url: `${process.env.API_URL}/characters/${slug}`,
        };
      } catch (err) {
        console.error("❌ Fetch character failed:", err);
        // fallback
        seo = staticMeta["/characters"];
      }
    } else if (staticMeta[path]) {
      seo = staticMeta[path];
    }

    // ---------- SSR render ----------
    res.render(
      indexHtml,
      { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] },
      (err, html) => {
        if (err) {
          console.error("SSR render error:", err);
          return res.status(500).send(err);
        }

        // ---------- Inject meta trước </head> ----------
        const injectedHtml = html.replace(
          "</head>",
          `
          <title>${seo.title}</title>
          <meta name="description" content="${seo.description}">
          <meta property="og:title" content="${seo.title}">
          <meta property="og:description" content="${seo.description}">
          <meta property="og:image" content="${seo.image}">
          <meta property="og:url" content="${seo.url}">
          <meta name="twitter:card" content="summary_large_image">
          </head>`
        );

        res.send(injectedHtml);
      }
    );
  });

  return server;
}

// ---------- 🏃 CHẠY SERVER ----------
function run(): void {
  const port = process.env.PORT || 4000;
  const server = app();
  server.listen(port, () =>
    console.log(`✅ SSR server running at ${process.env.API_URL}/${port}`)
  );
}

// ---------- 🧩 ENTRYPOINT ----------
// declare const __non_webpack_require__: NodeRequire;
// const mainModule = __non_webpack_require__.main;
// const moduleFilename = (mainModule && mainModule.filename) || "";
// if (moduleFilename === __filename || moduleFilename.includes("iisnode")) {
//   run();
// }

export * from "./src/main.server";
