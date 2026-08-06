import { describe, expect, test } from "vitest";

import { leadRowsToCsv } from "@/lib/export/lead-export";

describe("lead export", () => {
  test("uses the exact columns and leaves unknown fields blank", () => {
    const csv = leadRowsToCsv([{
      company_name: "Example, Ltd", website: "https://example.org", country: "", city: "", contact_name: "", role: "Head of Programming", email: "", source_url: "https://example.org/contact", category: "Family attraction operator | Buyer model: OWNER_OPERATOR", "size/signals": "NEW_EVENT: announced", notes: "Ask a question.", confidence: "MEDIUM", status: "APPROVED", owner: "Nick", last_touch: "", opt_out: "false",
    }]);
    expect(csv.split("\n")[0]).toBe("company_name,website,country,city,contact_name,role,email,source_url,category,size/signals,notes,confidence,status,owner,last_touch,opt_out");
    expect(csv).toContain('"Example, Ltd"');
    expect(csv).toContain(",,,Head of Programming,");
  });
});
