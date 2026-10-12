import { expect, test } from "bun:test";
import {
  type SessionStage,
  type SessionView,
  sessionStep,
} from "./session-stage";

/** What the page does at each moment, given the session as it changes. */
function pageOver(views: SessionView[]) {
  let stage: SessionStage = "unconfirmed";
  return views.map((view) => {
    const step = sessionStep(stage, view);
    stage = step.stage;
    return step.page;
  });
}

const loading = {
  isLoading: true,
  isAuthenticated: false,
  hasAccount: undefined,
};
const signedOut = {
  isLoading: false,
  isAuthenticated: false,
  hasAccount: undefined,
};
const signedOutNoAccount = { ...signedOut, hasAccount: false };
const signedIn = { isLoading: false, isAuthenticated: true, hasAccount: true };
const signedInAccountLoading = { ...signedIn, hasAccount: undefined };
const signedInNoAccount = { ...signedIn, hasAccount: false };

test("a page load shows the page while the session is being confirmed", () => {
  expect(pageOver([loading, signedInAccountLoading, signedIn])).toEqual([
    "show",
    "show",
    "show",
  ]);
});

test("right after signing in, a session not confirmed yet is never ended", () => {
  // Convex Auth can show the next page before it holds the new token: the
  // session looks signed out, and an account query answers without one.
  expect(
    pageOver([signedOut, signedOutNoAccount, signedInAccountLoading, signedIn]),
  ).toEqual(["hide", "hide", "show", "show"]);
});

test("signing out ends a confirmed session", () => {
  expect(pageOver([loading, signedIn, signedOut])).toEqual([
    "show",
    "show",
    "end",
  ]);
});

test("the account disappearing ends a confirmed session, still signed in", () => {
  expect(pageOver([signedIn, signedInNoAccount])).toEqual(["show", "end"]);
});

test("a confirmed session reloading its account goes on", () => {
  expect(
    pageOver([signedIn, signedInAccountLoading, loading, signedIn]),
  ).toEqual(["show", "show", "show", "show"]);
});

test("an ended session stays ended", () => {
  expect(pageOver([signedIn, signedOut, signedIn])).toEqual([
    "show",
    "end",
    "end",
  ]);
});
