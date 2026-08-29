import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://omoi.viuk-light.org";

const publicPages = [
    {
        file: "index.html",
        url: `${origin}/`,
        requiredTypes: ["WebSite", "SoftwareApplication", "WebPage"]
    },
    {
        file: "howto.html",
        url: `${origin}/howto.html`,
        requiredTypes: ["WebSite", "WebPage", "BreadcrumbList"]
    },
    {
        file: "guide.html",
        url: `${origin}/guide.html`,
        requiredTypes: ["WebSite", "WebPage", "BreadcrumbList"]
    }
];

const noindexPages = [
    "select.html",
    "question.html",
    "finish.html",
    "warning.html"
];

const errors = [];
const passes = [];

function read(relativePath) {
    const absolutePath = path.join(root, relativePath);

    if (!fs.existsSync(absolutePath)) {
        errors.push(`${relativePath}: file does not exist`);
        return "";
    }

    return fs.readFileSync(absolutePath, "utf8");
}

function checkPngDimensions(relativePath, expectedWidth, expectedHeight) {
    const absolutePath = path.join(root, relativePath);

    if (!fs.existsSync(absolutePath)) {
        return;
    }

    const buffer = fs.readFileSync(absolutePath);
    const isPng = buffer.length >= 24 &&
        buffer.readUInt32BE(0) === 0x89504e47 &&
        buffer.readUInt32BE(4) === 0x0d0a1a0a;

    if (!isPng) {
        errors.push(`${relativePath}: expected a PNG image`);
        return;
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    if (width !== expectedWidth || height !== expectedHeight) {
        errors.push(`${relativePath}: expected ${expectedWidth}x${expectedHeight}, found ${width}x${height}`);
    }
}

function attributes(tag) {
    const result = {};
    const attributePattern = /([:\w-]+)\s*=\s*["']([^"']*)["']/g;
    let match;

    while ((match = attributePattern.exec(tag)) !== null) {
        result[match[1].toLowerCase()] = match[2];
    }

    return result;
}

function htmlTags(html, tagName) {
    return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))]
        .map((match) => match[0]);
}

function metaValue(html, attributeName, expectedValue) {
    const expected = expectedValue.toLowerCase();

    for (const tag of htmlTags(html, "meta")) {
        const attrs = attributes(tag);

        if (attrs[attributeName] && attrs[attributeName].toLowerCase() === expected) {
            return attrs.content || "";
        }
    }

    return "";
}

function linkValue(html, relValue) {
    const expected = relValue.toLowerCase();

    for (const tag of htmlTags(html, "link")) {
        const attrs = attributes(tag);
        const rels = (attrs.rel || "").toLowerCase().split(/\s+/);

        if (rels.includes(expected)) {
            return attrs.href || "";
        }
    }

    return "";
}

function titleValue(html) {
    return (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
}

function jsonLdValues(html, page) {
    const scripts = [
        ...html.matchAll(
            /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        )
    ];
    const values = [];

    for (const match of scripts) {
        try {
            values.push(JSON.parse(match[1].trim()));
        } catch (error) {
            errors.push(`${page.file}: invalid JSON-LD (${error.message})`);
        }
    }

    return values;
}

function structuredDataTypes(values) {
    const types = new Set();

    for (const value of values) {
        const items = Array.isArray(value["@graph"]) ? value["@graph"] : [value];

        for (const item of items) {
            const itemTypes = Array.isArray(item["@type"])
                ? item["@type"]
                : [item["@type"]];

            for (const type of itemTypes) {
                if (type) {
                    types.add(type);
                }
            }
        }
    }

    return types;
}

function localPathFromUrl(value) {
    const parsed = new URL(value, origin);

    if (parsed.origin !== origin) {
        return null;
    }

    const pathname = parsed.pathname === "/"
        ? "index.html"
        : parsed.pathname.replace(/^\//, "");

    return pathname;
}

function checkInternalLinks(page, html) {
    for (const tag of htmlTags(html, "a")) {
        const href = attributes(tag).href || "";

        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
            continue;
        }

        let resolved;

        try {
            resolved = new URL(href, page.url).toString();
        } catch (error) {
            errors.push(`${page.file}: invalid link ${href} (${error.message})`);
            continue;
        }

        const localPath = localPathFromUrl(resolved);

        if (localPath && !fs.existsSync(path.join(root, localPath))) {
            errors.push(`${page.file}: internal link target does not exist: ${href}`);
        }
    }
}

for (const page of publicPages) {
    const html = read(page.file);
    const title = titleValue(html);
    const description = metaValue(html, "name", "description");
    const canonical = linkValue(html, "canonical");
    const robots = metaValue(html, "name", "robots").toLowerCase();
    const ogImage = metaValue(html, "property", "og:image");
    const twitterImage = metaValue(html, "name", "twitter:image");
    const jsonLd = jsonLdValues(html, page);
    const types = structuredDataTypes(jsonLd);

    if (!title) {
        errors.push(`${page.file}: title is missing`);
    }

    if (!description) {
        errors.push(`${page.file}: meta description is missing`);
    }

    if (canonical !== page.url) {
        errors.push(`${page.file}: canonical must be ${page.url}`);
    }

    if (robots.includes("noindex")) {
        errors.push(`${page.file}: public page must not be noindex`);
    }

    if ((html.match(/<h1\b/gi) || []).length !== 1) {
        errors.push(`${page.file}: expected exactly one h1`);
    }

    if (metaValue(html, "property", "og:type") !== "website") {
        errors.push(`${page.file}: og:type must be website`);
    }

    if (metaValue(html, "property", "og:title") !== title) {
        errors.push(`${page.file}: og:title must match title`);
    }

    if (!metaValue(html, "property", "og:description")) {
        errors.push(`${page.file}: og:description is missing`);
    }

    if (metaValue(html, "property", "og:url") !== page.url) {
        errors.push(`${page.file}: og:url must match canonical`);
    }

    if (ogImage !== `${origin}/og-image.png` || twitterImage !== ogImage) {
        errors.push(`${page.file}: OGP and Twitter image must use ${origin}/og-image.png`);
    }

    if (!metaValue(html, "property", "og:image:alt")) {
        errors.push(`${page.file}: og:image:alt is missing`);
    }

    if (!metaValue(html, "name", "twitter:image:alt")) {
        errors.push(`${page.file}: twitter:image:alt is missing`);
    }

    if (metaValue(html, "property", "og:image:width") !== "1200") {
        errors.push(`${page.file}: og:image:width must be 1200`);
    }

    if (metaValue(html, "property", "og:image:height") !== "630") {
        errors.push(`${page.file}: og:image:height must be 630`);
    }

    if (metaValue(html, "name", "twitter:card") !== "summary_large_image") {
        errors.push(`${page.file}: twitter:card must be summary_large_image`);
    }

    if (linkValue(html, "icon") !== "viuk-light.jpg") {
        errors.push(`${page.file}: favicon must be viuk-light.jpg`);
    }

    for (const type of page.requiredTypes) {
        if (!types.has(type)) {
            errors.push(`${page.file}: JSON-LD is missing @type ${type}`);
        }
    }

    checkInternalLinks(page, html);
    passes.push(`${page.file}: public SEO metadata and links checked`);
}

for (const page of noindexPages) {
    const html = read(page);
    const robots = metaValue(html, "name", "robots").toLowerCase();

    if (!robots.includes("noindex")) {
        errors.push(`${page}: expected noindex robots metadata`);
    }
}

const sitemap = read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => match[1]);
const expectedSitemapUrls = publicPages.map((page) => page.url);

if (!sitemap.includes("<urlset") || !sitemap.includes("</urlset>")) {
    errors.push("sitemap.xml: urlset root is missing");
}

if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedSitemapUrls)) {
    errors.push(`sitemap.xml: expected URLs ${expectedSitemapUrls.join(", ")}; found ${sitemapUrls.join(", ")}`);
}

if (!read("robots.txt").includes(`Sitemap: ${origin}/sitemap.xml`)) {
    errors.push("robots.txt: sitemap directive is missing or incorrect");
}

for (const asset of ["og-image.png", "viuk-light.jpg"]) {
    if (!fs.existsSync(path.join(root, asset))) {
        errors.push(`${asset}: referenced asset does not exist`);
    }
}

checkPngDimensions("og-image.png", 1200, 630);

if (errors.length > 0) {
    console.error(`SEO verification failed with ${errors.length} error(s).`);
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exitCode = 1;
} else {
    console.log(`SEO verification passed for ${passes.length} public page(s).`);
}
