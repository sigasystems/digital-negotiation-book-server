import crypto from "crypto";

export default function generateSecurePassword(length = 12) {
  if (length < 8) {
    throw new Error("Password length must be at least 8 characters.");
  }

  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()[]{}<>?/|~`";

  const allChars = upper + lower + numbers + symbols;

  const mustInclude = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    numbers[randomIndex(numbers.length)],
    symbols[randomIndex(symbols.length)],
  ];

  const remainingLength = length - mustInclude.length;
  const remaining = Array.from({ length: remainingLength }, () => {
    return allChars[randomIndex(allChars.length)];
  });

  const passwordArray = [...mustInclude, ...remaining];
  return secureShuffle(passwordArray).join("");
}

function randomIndex(max) {
  return crypto.randomBytes(1)[0] % max;
}

function secureShuffle(array) {
  const buf = crypto.randomBytes(array.length);
  for (let i = array.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}