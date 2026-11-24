const mounted = new WeakMap();

function record(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object.`);
}

function text(value, name) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
    return value;
}

function list(value, name) {
    if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${name} must be a non-empty array.`);
    return value;
}

/** Validate and own presentation data before touching the document. */
export function normalizeSummaryContent(input, { baseUrl = import.meta.url } = {}) {
    return list(input, 'summary content').map((block, index) => {
        const name = `blocks[${index}]`;
        record(block, name);
        switch (block.type) {
            case 'text':
                return { type: 'text', text: text(block.text, `${name}.text`) };
            case 'bullets':
                return {
                    type: 'bullets',
                    items: list(block.items, `${name}.items`).map((item, itemIndex) => {
                        record(item, `${name}.items[${itemIndex}]`);
                        return {
                            ...(item.label === undefined ? {} : { label: text(item.label, `${name}.items[${itemIndex}].label`) }),
                            text: text(item.text, `${name}.items[${itemIndex}].text`)
                        };
                    })
                };
            case 'table': {
                const columns = list(block.columns, `${name}.columns`).map((column, columnIndex) => text(column, `${name}.columns[${columnIndex}]`));
                const rows = list(block.rows, `${name}.rows`).map((row, rowIndex) => {
                    if (!Array.isArray(row) || row.length !== columns.length) throw new TypeError(`${name}.rows[${rowIndex}] must match the columns.`);
                    return row.map((cell, cellIndex) => text(cell, `${name}.rows[${rowIndex}][${cellIndex}]`));
                });
                return { type: 'table', caption: text(block.caption, `${name}.caption`), columns, rows };
            }
            case 'image': {
                const source = text(block.src, `${name}.src`);
                let base, url;
                try { base = new URL(baseUrl); url = new URL(source, base); }
                catch { throw new TypeError(`${name}.src must be a valid image URL.`); }
                if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin) {
                    throw new TypeError(`${name}.src must use same-origin HTTP(S).`);
                }
                return {
                    type: 'image', src: url.href, alt: text(block.alt, `${name}.alt`),
                    ...(block.caption === undefined ? {} : { caption: text(block.caption, `${name}.caption`) })
                };
            }
            default:
                throw new TypeError(`${name}.type must be text, bullets, table, or image.`);
        }
    });
}

/** Mount only when the reader opens the summary; cleanup removes the mounted content. */
export function renderSummaryContent(host, input) {
    if (!host || host.nodeType !== 1 || !host.ownerDocument) throw new TypeError('host must be an Element.');
    if (mounted.has(host)) throw new TypeError('This host already contains summary content.');
    const blocks = normalizeSummaryContent(input);
    const document = host.ownerDocument;
    if (!document.defaultView) throw new TypeError('A browser document is required.');
    const element = (tag, className, content) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined) node.textContent = content;
        return node;
    };
    const root = element('div', 'summary-content');
    for (const block of blocks) {
        if (block.type === 'text') root.append(element('p', '', block.text));
        if (block.type === 'bullets') {
            const bullets = element('ul', 'summary-bullets');
            for (const item of block.items) {
                const row = element('li');
                if (item.label !== undefined) row.append(element('strong', '', `${item.label}：`));
                row.append(document.createTextNode(item.text));
                bullets.append(row);
            }
            root.append(bullets);
        }
        if (block.type === 'table') {
            const wrapper = element('div', 'summary-table-wrap');
            const table = element('table');
            table.append(element('caption', '', block.caption));
            const head = element('thead');
            const header = element('tr');
            for (const column of block.columns) {
                const cell = element('th', '', column); cell.scope = 'col'; header.append(cell);
            }
            head.append(header); table.append(head);
            const body = element('tbody');
            for (const cells of block.rows) {
                const row = element('tr');
                for (const cell of cells) row.append(element('td', '', cell));
                body.append(row);
            }
            table.append(body); wrapper.append(table); root.append(wrapper);
        }
        if (block.type === 'image') {
            const figure = element('figure', 'summary-figure');
            const image = element('img');
            image.alt = block.alt; image.loading = 'lazy'; image.src = block.src;
            figure.append(image);
            if (block.caption !== undefined) figure.append(element('figcaption', '', block.caption));
            root.append(figure);
        }
    }
    let destroyed = false;
    function destroy() {
        if (destroyed) return;
        destroyed = true;
        root.remove();
        mounted.delete(host);
    }
    try {
        host.append(root);
        const api = { destroy };
        mounted.set(host, api);
        return api;
    } catch (error) {
        destroy();
        throw error;
    }
}
