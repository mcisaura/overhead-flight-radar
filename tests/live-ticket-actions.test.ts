import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LiveTicketActions from "../components/boarding-pass/live-ticket-actions";

test("a pending location request leaves refresh and simulation available", () => {
  const html = renderToStaticMarkup(createElement(LiveTicketActions, {
    locating: true, onUseLocation: () => {}, onRefresh: () => {}, onSimulate: () => {}, onChooseLocation: () => {}, zoneSettingsOpen: false,
  }));
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  assert.equal(buttons.length, 4);
  assert.match(buttons[0], /disabled=""/);
  assert.match(buttons[0], /aria-busy="true"/);
  assert.match(buttons[1], /aria-label="Choose location and zone"/);
  assert.match(buttons[1], /aria-haspopup="dialog"/);
  assert.match(buttons[1], /aria-expanded="false"/);
  assert.match(buttons[2], /aria-label="Refresh sky"/);
  assert.match(buttons[2], /title="Refresh sky"/);
  assert.match(buttons[3], /Try simulated flights/);
  for (const button of buttons.slice(1)) assert.doesNotMatch(button, /disabled/);
});
