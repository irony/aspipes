// Direct implementation of the Hacker News comment syntax
// https://news.ycombinator.com/item?id=42675858

import { createAsPipes } from './index.js';

const { asPipe, pipe } = createAsPipes();

// Define the transformation functions
const trim = asPipe((s) => (typeof s === 'string' ? s.trim() : s));
const truncate = asPipe((s, len = 20) => {
  if (typeof s !== 'string') return s;
  return s.length > len ? s.slice(0, len) + '...' : s;
});
const bold = asPipe((s) => `**${s}**`);
const required = asPipe((s) => {
  if (!s || s.length === 0) throw new Error('Required');
  return s;
});
const email = asPipe((s) => {
  if (!s.includes('@')) throw new Error('Invalid email');
  return s;
});

// Example from HN comment:
// grid.columns.name.format(v => v | trim | truncate | bold)
// form.fields.name.validate(v => v | trim | required | email)

const grid = {
  columns: {
    name: {
      format: pipe((v) => v | trim | truncate | bold),
    },
  },
};

const form = {
  fields: {
    name: {
      validate: pipe((v) => v | trim | required | email),
    },
  },
};

// Test it
console.log('Grid column formatting:');
console.log(await grid.columns.name.format('  A very long column name  '));
// Output: **A very long column ...**

console.log('\nForm field validation:');
console.log(await form.fields.name.validate('  user@example.com  '));
// Output: user@example.com

try {
  await form.fields.name.validate('  invalid  ');
} catch (e) {
  console.log('Validation error:', e.message);
  // Output: Validation error: Invalid email
}
