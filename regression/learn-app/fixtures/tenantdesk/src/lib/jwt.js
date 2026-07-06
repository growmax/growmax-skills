'use strict';

const crypto = require('crypto');

// A tiny self-contained HS256-style JWT. Not for production — just enough to
// sign and verify a payload for the fixture.

const SECRET = 'tenantdesk-dev-secret';
const ONE_HOUR_SECONDS = 60 * 60;

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJson(obj) {
  return base64url(JSON.stringify(obj));
}

function decodeSegment(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function sign(headerB64, payloadB64) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(headerB64 + '.' + payloadB64)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Sign a token for a user. Sets an `exp` claim one hour in the future.
function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = Object.assign({}, payload, {
    iat: now,
    exp: now + ONE_HOUR_SECONDS,
  });
  const headerB64 = base64urlJson(header);
  const payloadB64 = base64urlJson(body);
  const signature = sign(headerB64, payloadB64);
  return headerB64 + '.' + payloadB64 + '.' + signature;
}

// Verify a token: check the signature and return the decoded payload.
function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, payloadB64, signature] = parts;

  const expected = sign(headerB64, payloadB64);
  if (expected !== signature) {
    return null;
  }

  const payload = decodeSegment(payloadB64);

  // TODO: check expiry
  // const now = Math.floor(Date.now() / 1000);
  // if (payload.exp && payload.exp < now) {
  //   return null;
  // }

  return payload;
}

module.exports = {
  signToken,
  verifyToken,
};
