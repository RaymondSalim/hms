import {Prisma} from "@prisma/client";
import {describe, expect, test} from "@jest/globals";
import {serializeForClient} from "@/app/_lib/util/prisma";

describe("serializeForClient", () => {
  test("converts nested Prisma.Decimal values to strings", () => {
    const input = {
      amount: new Prisma.Decimal("123.45"),
      nested: {
        items: [
          new Prisma.Decimal(10),
          {fee: new Prisma.Decimal("0.99")}
        ]
      }
    };

    const output = serializeForClient(input);

    expect(output).toEqual({
      amount: "123.45",
      nested: {
        items: ["10", {fee: "0.99"}]
      }
    });
  });

  test("preserves nulls and primitives", () => {
    const input = {
      count: 3,
      label: "ok",
      active: true,
      none: null,
      missing: undefined
    };

    const output = serializeForClient(input);

    expect(output).toEqual(input);
  });
});
