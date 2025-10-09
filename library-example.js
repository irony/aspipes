// Example demonstrating the Hacker News comment use case
// This shows how library authors can enable pipeline-style configuration

import { createAsPipes } from './index.js';

const { asPipe, pipeFn } = createAsPipes();

// ============================================================================
// Define reusable transformation and validation functions
// ============================================================================

const trim = asPipe((s) => (typeof s === 'string' ? s.trim() : s));
const truncate = asPipe((s, len = 20) => {
  if (typeof s !== 'string') return s;
  return s.length > len ? s.slice(0, len) + '...' : s;
});
const bold = asPipe((s) => `**${s}**`);
const required = asPipe((s) => {
  if (!s || s.length === 0) throw new Error('Field is required');
  return s;
});
const email = asPipe((s) => {
  if (!s.includes('@')) throw new Error('Invalid email address');
  return s;
});
const minLength = asPipe((s, len) => {
  if (s.length < len) throw new Error(`Minimum length is ${len} characters`);
  return s;
});

// ============================================================================
// Example 1: Grid column formatting (as mentioned in HN comment)
// ============================================================================

console.log('=== Grid Column Formatting ===\n');

const grid = {
  columns: {
    name: {
      format: null,
    },
    description: {
      format: null,
    },
  },
};

// Users can configure formatters with clean pipe syntax
grid.columns.name.format = pipeFn((v) => v | trim | truncate(15) | bold);
grid.columns.description.format = pipeFn((v) => v | trim | truncate(50));

// Use formatters
const formattedName = await grid.columns.name.format(
  '  John Doe with a very long name  ',
);
console.log('Formatted name:', formattedName);
// Output: **John Doe with...**

const formattedDesc = await grid.columns.description.format(
  '  This is a long description that will be truncated to fit  ',
);
console.log('Formatted description:', formattedDesc);
// Output: This is a long description that will be truncat...

// ============================================================================
// Example 2: Form field validation (as mentioned in HN comment)
// ============================================================================

console.log('\n=== Form Field Validation ===\n');

const form = {
  fields: {
    name: {
      validate: null,
    },
    email: {
      validate: null,
    },
    username: {
      validate: null,
    },
  },
};

// Users can configure validators with clean pipe syntax
form.fields.name.validate = pipeFn((v) => v | trim | required | minLength(3));
form.fields.email.validate = pipeFn((v) => v | trim | required | email);
form.fields.username.validate = pipeFn(
  (v) => v | trim | required | minLength(3),
);

// Test valid inputs
console.log('Valid name:', await form.fields.name.validate('  John Doe  '));
console.log(
  'Valid email:',
  await form.fields.email.validate('  john@example.com  '),
);
console.log('Valid username:', await form.fields.username.validate('  john123  '));

// Test invalid inputs
console.log('\n--- Testing validation errors ---\n');

try {
  await form.fields.name.validate('  JD  ');
} catch (e) {
  console.log('Name validation error:', e.message);
}

try {
  await form.fields.email.validate('  invalid  ');
} catch (e) {
  console.log('Email validation error:', e.message);
}

try {
  await form.fields.email.validate('   ');
} catch (e) {
  console.log('Empty email error:', e.message);
}

// ============================================================================
// Example 3: Complex validation chains
// ============================================================================

console.log('\n=== Complex Validation Chains ===\n');

const password = asPipe((s) => {
  if (!/[A-Z]/.test(s)) throw new Error('Password must contain uppercase');
  if (!/[0-9]/.test(s)) throw new Error('Password must contain number');
  return s;
});

const confirmPassword = asPipe((s, original) => {
  if (s !== original) throw new Error('Passwords do not match');
  return s;
});

form.fields.password = {
  validate: pipeFn(
    (v) => v | trim | required | minLength(8) | password,
  ),
};

try {
  await form.fields.password.validate('  SecurePass123  ');
  console.log('Password validation: PASSED');
} catch (e) {
  console.log('Password validation error:', e.message);
}

try {
  await form.fields.password.validate('  short  ');
} catch (e) {
  console.log('Weak password error:', e.message);
}

// ============================================================================
// Example 4: Data transformation pipelines
// ============================================================================

console.log('\n=== Data Transformation Pipelines ===\n');

const parseJson = asPipe((s) => JSON.parse(s));
const extractField = asPipe((obj, field) => obj[field]);
const toUpperCase = asPipe((s) => s.toUpperCase());

const dataProcessor = {
  transform: pipeFn(
    (v) => v | trim | parseJson | extractField('name') | toUpperCase,
  ),
};

const jsonData = '  {"name": "alice", "age": 30}  ';
const result = await dataProcessor.transform(jsonData);
console.log('Transformed data:', result);
// Output: ALICE

console.log('\n=== All examples completed successfully! ===');
