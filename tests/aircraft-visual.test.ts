import assert from "node:assert/strict";
import { test } from "node:test";
import { aircraftVisualForFlight } from "../lib/aircraft-visual";

test("business jets stay small even with a charter operator", () => {
  for (const aircraftType of ["E550", "E545", "CL60", "CL35", "FA7X", "FA8X", "F900", "F2TH", "GLEX", "GL7T", "C750", "E55P"]) {
    assert.equal(aircraftVisualForFlight({ aircraftType, airline: { name: "Flexjet", iata: null, color: "#000", accent: "#fff" } }), "small", aircraftType);
  }
});

test("airliners and regional aircraft use the large illustration without airline data", () => {
  for (const aircraftType of ["B738", "B78X", "A359", "A20N", "BCS3", "E175", "E75L", "CRJ9", "DH8D", "AT76", "F100", "F70"]) {
    assert.equal(aircraftVisualForFlight({ aircraftType }), "airliner", aircraftType);
  }
});

test("known aircraft codes take priority over conflicting model hints", () => {
  assert.equal(aircraftVisualForFlight({ aircraftType: "B738", aircraftModel: "Cessna" }), "airliner");
  assert.equal(aircraftVisualForFlight({ aircraftType: "E550", aircraftModel: "Airbus" }), "small");
  assert.equal(aircraftVisualForFlight({ aircraftType: "B407", aircraftModel: "Boeing" }), "helicopter");
});

test("readable models classify unfamiliar or missing type codes", () => {
  for (const aircraftModel of ["Embraer Legacy 500", "Bombardier Challenger 650", "Dassault Falcon 900", "Bombardier Global 7500", "Cessna 310"]) {
    assert.equal(aircraftVisualForFlight({ aircraftType: "UNKN", aircraftModel }), "small", aircraftModel);
  }
  for (const aircraftModel of ["Boeing 737-800", "Airbus A320", "Embraer 175", "Bombardier CRJ 900", "ATR 72"]) {
    assert.equal(aircraftVisualForFlight({ aircraftModel }), "airliner", aircraftModel);
  }
  assert.equal(aircraftVisualForFlight({ aircraftModel: "Airbus Helicopters H145" }), "helicopter");
});

test("unknown aircraft default to small independently of operator identity", () => {
  assert.equal(aircraftVisualForFlight({}), "small");
  assert.equal(aircraftVisualForFlight({ aircraftType: "UNKN" }), "small");
  assert.equal(aircraftVisualForFlight({ aircraftType: "UNKN", airline: { name: "United", iata: null, color: "#000", accent: "#fff" } }), "small");
});

test("codes normalize whitespace and case across all three categories", () => {
  assert.equal(aircraftVisualForFlight({ aircraftType: " b738 " }), "airliner");
  assert.equal(aircraftVisualForFlight({ aircraftType: " e550 " }), "small");
  assert.equal(aircraftVisualForFlight({ aircraftType: " r44 " }), "helicopter");
});
