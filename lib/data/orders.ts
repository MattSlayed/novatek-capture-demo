/* ================================================================
   WORK ORDERS

   The five work orders the preview's walkthrough runs on:
   WO-2026-0142, 0151, 0137, 0129 and 0133. Each order's internal
   `wo-NNNN` id and its display `WO-2026-NNNN` number are two
   distinct strings, never conflated (D-CONV) — the internal id is
   what every route path and every `SyncItem.order_id` uses, the
   display number is what a surface renders.

   Each order's `governing_docs` is the deduplicated, sorted union of
   its own assets' `governing_docs` codes as they appear in
   plant.ts — every code resolves in `DOC_BY_CODE`. Each order's
   `provenance` is a literal `Provenance` object: a work order is a
   record the ERP states, not an authored observation, so
   `grade: "EXTRACTED"` is correct and legitimate here. `plant.ts`'s
   `prov()` is module-private and is not called from this file.

   The downstream header relief valve kept in plant.ts purely for the
   referral fixture appears in no order's `asset_ids` below — it is
   deliberately on nobody's order and reaches the fixtures only
   through the register and the referral.

   lib/data imports nothing from lib/store, lib/reconcile or
   lib/access (D-20, D-DEP).
   ================================================================ */

import type { WorkOrder } from "./types";

export const ORDERS: WorkOrder[] = [
  {
    id: "wo-0142",
    number: "WO-2026-0142",
    title: "Strip and assess transfer set C",
    description: "Strip and assess transfer set C in the Pump Hall.",
    assigned_to: "acc-mabaso",
    zone_id: "z01",
    asset_ids: ["m-ap003", "m-aa101", "m-aa102"],
    governing_docs: ["RPL-PR-I-1", "RPL-PR-S-1", "RPL-WI-O-6", "RPL-WI-O-9"],
    priority: "High",
    raised_on: "2026-07-20",
    due_by: "2026-07-31",
    status: "assigned",
    provenance: {
      source_uri: "erp://work-order/WO-2026-0142",
      source_version: "read 2026-07-26",
      extracted_at: "2026-07-26T06:12:41+02:00",
      extractor_hash: "sha256:7c1e4a92f0d3b6851a7c2e9f0431dabc",
      confidence: 0.99,
      grade: "EXTRACTED",
      source_label: "Maintenance management system",
      system_of_record: "ERP",
    },
  },
  {
    id: "wo-0151",
    number: "WO-2026-0151",
    title: "Duplex strainer element clean",
    description: "Clean the duplex strainer element in the Valve Station & Manifold.",
    assigned_to: "acc-mabaso",
    zone_id: "z02",
    asset_ids: ["m-as001"],
    governing_docs: ["RPL-PR-S-1"],
    priority: "Medium",
    raised_on: "2026-07-22",
    due_by: "2026-08-05",
    status: "assigned",
    provenance: {
      source_uri: "erp://work-order/WO-2026-0151",
      source_version: "read 2026-07-26",
      extracted_at: "2026-07-26T06:12:41+02:00",
      extractor_hash: "sha256:2f8b6d15a9c40e7213b5f8a0d64c9271",
      confidence: 0.99,
      grade: "EXTRACTED",
      source_label: "Maintenance management system",
      system_of_record: "ERP",
    },
  },
  {
    id: "wo-0137",
    number: "WO-2026-0137",
    title: "Protection test — set C feeder",
    description: "Run the protection test on the set C feeder in the Motor Control Centre.",
    assigned_to: "acc-naidoo",
    zone_id: "z04",
    asset_ids: ["m-gs001", "m-an001"],
    governing_docs: ["RPL-PR-S-1", "RPL-WI-O-6"],
    priority: "High",
    raised_on: "2026-07-18",
    due_by: "2026-07-30",
    status: "assigned",
    provenance: {
      source_uri: "erp://work-order/WO-2026-0137",
      source_version: "read 2026-07-26",
      extracted_at: "2026-07-26T06:12:41+02:00",
      extractor_hash: "sha256:9a34c7e02b6f184d5a9e3c701fb62d84",
      confidence: 0.99,
      grade: "EXTRACTED",
      source_label: "Maintenance management system",
      system_of_record: "ERP",
    },
  },
  {
    id: "wo-0129",
    number: "WO-2026-0129",
    title: "Relief valve re-cert support",
    description:
      "Support the re-certification of the header relief valves in the Valve Station & Manifold.",
    assigned_to: "acc-vanwyk",
    zone_id: "z02",
    asset_ids: ["m-aa601", "m-aa602"],
    governing_docs: ["RPL-PR-O-17", "RPL-WI-O-9"],
    priority: "High",
    raised_on: "2026-07-15",
    due_by: "2026-07-29",
    status: "assigned",
    provenance: {
      source_uri: "erp://work-order/WO-2026-0129",
      source_version: "read 2026-07-26",
      extracted_at: "2026-07-26T06:12:41+02:00",
      extractor_hash: "sha256:e651fa08d2c9743b0a6f1e895dc4b207",
      confidence: 0.99,
      grade: "EXTRACTED",
      source_label: "Maintenance management system",
      system_of_record: "ERP",
    },
  },
  {
    id: "wo-0133",
    number: "WO-2026-0133",
    title: "Surge vessel inspection prep",
    description:
      "Prepare the surge vessel and lube oil cooler for inspection in the Process Bay & Vessels.",
    assigned_to: "acc-vanwyk",
    zone_id: "z03",
    asset_ids: ["m-bb001", "m-ac001"],
    governing_docs: ["RPL-PR-I-1", "RPL-PR-O-3"],
    priority: "Medium",
    raised_on: "2026-07-17",
    due_by: "2026-08-07",
    status: "assigned",
    provenance: {
      source_uri: "erp://work-order/WO-2026-0133",
      source_version: "read 2026-07-26",
      extracted_at: "2026-07-26T06:12:41+02:00",
      extractor_hash: "sha256:4b0d8f61a3e7c92501d4b8a6f0937ce5",
      confidence: 0.99,
      grade: "EXTRACTED",
      source_label: "Maintenance management system",
      system_of_record: "ERP",
    },
  },
];

export const ORDER_BY_ID = new Map(ORDERS.map((o) => [o.id, o]));
