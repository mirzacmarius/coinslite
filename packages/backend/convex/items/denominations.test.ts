import { expect, test } from "bun:test";
import {
  compareDenominations,
  denominationText,
  faceValue,
  sameDenomination,
} from "./denominations";

test("a denomination's face value is its number of major units", () => {
  expect(faceValue("1 krone")).toBe(1);
  expect(faceValue("10 kroner")).toBe(10);
  expect(faceValue("2 Euro")).toBe(2);
  expect(faceValue("Centenario 50 pesos")).toBe(50);
  expect(faceValue("dollar")).toBe(1);
});

test("minor units count as hundredths", () => {
  expect(faceValue("50 øre")).toBe(0.5);
  expect(faceValue("2 öre")).toBe(0.02);
  expect(faceValue("25 cents")).toBe(0.25);
  expect(faceValue("50 Euro Cent")).toBe(0.5);
  expect(faceValue("10 bani")).toBe(0.1);
  expect(faceValue("5 Rappen")).toBe(0.05);
  expect(faceValue("20 Pfennig")).toBe(0.2);
  expect(faceValue("1 penny")).toBe(0.01);
  expect(faceValue("50p")).toBe(0.5);
  expect(faceValue("5 céntimos")).toBe(0.05);
});

test("fractions, decimals and grouped thousands are read as numbers", () => {
  expect(faceValue("½ krone")).toBe(0.5);
  expect(faceValue("1/2 dollar")).toBe(0.5);
  expect(faceValue("1 1/2 penny")).toBeCloseTo(0.015);
  expect(faceValue("2½ kroner")).toBe(2.5);
  expect(faceValue("2,5 Mark")).toBe(2.5);
  expect(faceValue("2.5 dollars")).toBe(2.5);
  expect(faceValue("1 000 kroner")).toBe(1000);
  expect(faceValue("1,000 dollars")).toBe(1000);
  expect(faceValue("half dollar")).toBe(0.5);
  expect(faceValue("quarter dollar")).toBe(0.25);
  expect(faceValue("dime")).toBeCloseTo(0.1);
});

test("an empty denomination has no face value", () => {
  expect(faceValue("")).toBeUndefined();
  expect(faceValue("  ")).toBeUndefined();
  expect(faceValue("–")).toBeUndefined();
});

test("denominations sort by face value, smallest first, missing ones last", () => {
  const denominations = [
    "10 kroner",
    undefined,
    "25 øre",
    "1 krone",
    "2 øre",
    "½ krone",
    "5 kroner",
  ];

  expect([...denominations].sort(compareDenominations)).toEqual([
    "2 øre",
    "25 øre",
    "½ krone",
    "1 krone",
    "5 kroner",
    "10 kroner",
    undefined,
  ]);
});

test("two denominations are the same when they read alike or count the same face value", () => {
  expect(sameDenomination("1 Krone", "1 krone")).toBe(true);
  expect(sameDenomination("  50  Øre ", "50 øre")).toBe(true);
  expect(sameDenomination("1 kroner", "1 krone")).toBe(true);
  expect(sameDenomination("½ krone", "50 øre")).toBe(true);
  expect(sameDenomination("dime", "10 cents")).toBe(true);
  expect(sameDenomination("10 øre", "10 kroner")).toBe(false);
  expect(sameDenomination("2 kroner", "1 krone")).toBe(false);
  expect(sameDenomination("", "1 krone")).toBe(false);
  expect(sameDenomination("–", "—")).toBe(false);
});

test("reading alike ignores capitals, accents and spacing", () => {
  expect(denominationText(" 50  Øre ")).toBe("50 øre");
  expect(denominationText("5 Céntimos")).toBe("5 centimos");
});
