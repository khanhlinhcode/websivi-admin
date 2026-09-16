import { describe, expect, it } from "vitest";
import reducer, { setAuthenticatedUser } from "./authSlice";

describe("admin auth boundary", () => {
  it.each(["customer", "disabled", undefined])("does not accept a %s session", (role) => {
    const admin = reducer(undefined, setAuthenticatedUser({ id: 1, role: "admin" }));
    expect(reducer(admin, setAuthenticatedUser({ id: 2, role })).adminUser).toBeNull();
  });
  it.each(["admin", "staff"])("accepts a server authenticated %s", (role) => {
    const user = { id: 1, role };
    expect(reducer(undefined, setAuthenticatedUser(user)).adminUser).toEqual(user);
  });
});
