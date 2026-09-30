import {writeFile} from 'node:fs/promises';
import {mountFlower} from '../assets/polarization-flower.mjs';

const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[character]));

class SvgElement {
  constructor(name, document) {
    this.name = name;
    this.ownerDocument = document;
    this.attributes = new Map();
    this.children = [];
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  appendChild(child) { this.children.push(child); return child; }
  serialize() {
    const attributes = [...this.attributes].map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join('');
    return `<${this.name}${attributes}>${this.children.map(child => child.serialize()).join('')}</${this.name}>`;
  }
}

const document = {createElementNS: (_namespace, name) => new SvgElement(name, document)};
const painting = document.createElementNS('http://www.w3.org/2000/svg', 'g');
mountFlower(painting).paint(1);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img" aria-labelledby="flower-title flower-description"><title id="flower-title">x-polarized floral image</title><desc id="flower-description">Illustrative application concept using five colors sampled from the paper. This is not a fabricated or measured image-display device.</desc>${painting.serialize()}</svg>\n`;
await writeFile(new URL('../assets/polarization-flower.svg', import.meta.url), svg, 'utf8');
console.log('Generated assets/polarization-flower.svg');
