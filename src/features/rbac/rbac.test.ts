import { describe, expect, it } from "vitest";

import type { RolePublic } from "@/api/generated/types.gen";

import {
  canAssignRole,
  canChangeStatus,
  canGrant,
  permissionEditable,
} from "./grants";
import { roleFormSchema, toRoleCreate, toRoleUpdate } from "./role-form";

const role = (name: string, ...permissions: string[]) =>
  ({
    id: `${name}-id`,
    name,
    description: "",
    permissions,
    is_system: false,
    is_default: false,
    created_at: "2026-11-01T12:00:00Z",
    updated_at: "2026-11-01T12:00:00Z",
  }) as RolePublic;

const ALL = [
  "posts:create",
  "comments:create",
  "users:read:any",
  "users:assign_roles",
  "users:deactivate",
  "roles:read",
];
const admin = role("admin", ...ALL);
const reader = role("reader", "comments:create");
const writer = role("writer", "posts:create", "comments:create");

const person = (id: string, ...permissions: string[]) => ({ id, permissions });
const administrator = person("a".repeat(24), ...ALL);
// May hand out roles, but holds only what a reader holds besides.
const gatekeeper = person(
  "b".repeat(24),
  "users:read:any",
  "users:assign_roles",
  "users:deactivate",
  "comments:create"
);

describe("canGrant", () => {
  it("allows what the person holds, and nothing given is always allowed", () => {
    expect(canGrant(gatekeeper, ["comments:create"])).toBe(true);
    expect(canGrant(gatekeeper, [])).toBe(true);
  });

  it("refuses anything the person doesn't hold", () => {
    expect(canGrant(gatekeeper, ["comments:create", "posts:create"])).toBe(
      false
    );
    expect(canGrant(null, ["comments:create"])).toBe(false);
  });
});

describe("canAssignRole", () => {
  it("allows a role whose every permission is held", () => {
    expect(canAssignRole(gatekeeper, reader)).toBe(true);
  });

  // Otherwise the permission to assign roles would be the permission to
  // make oneself an administrator.
  it("refuses a role carrying anything not held, the admin role above all", () => {
    expect(canAssignRole(gatekeeper, writer)).toBe(false);
    expect(canAssignRole(gatekeeper, admin)).toBe(false);
  });

  it("needs the permission to assign roles at all", () => {
    const holdsEverythingElse = person("c".repeat(24), "comments:create");

    expect(canAssignRole(holdsEverythingElse, reader)).toBe(false);
  });
});

describe("canChangeStatus", () => {
  const roles = [admin, reader, writer];
  const account = (id: string, ...held: RolePublic[]) => ({
    id,
    roles: held.map(({ id: roleId, name }) => ({ id: roleId, name })),
  });

  it("allows switching off an account whose every permission is held", () => {
    expect(canChangeStatus(gatekeeper, account("x", reader), roles)).toBe(true);
  });

  // Without this, the permission to deactivate would be the permission to
  // switch off every administrator but oneself.
  it("refuses an account holding more than the caller", () => {
    expect(canChangeStatus(gatekeeper, account("x", writer), roles)).toBe(
      false
    );
    expect(canChangeStatus(gatekeeper, account("x", admin), roles)).toBe(false);
  });

  it("never offers it for one's own account, an administrator's included", () => {
    expect(
      canChangeStatus(administrator, account(administrator.id, admin), roles)
    ).toBe(false);
  });

  it("needs the permission to deactivate", () => {
    const noSwitch = person("d".repeat(24), "comments:create");

    expect(canChangeStatus(noSwitch, account("x", reader), roles)).toBe(false);
  });
});

describe("permissionEditable", () => {
  it("lets a held permission be added", () => {
    expect(permissionEditable(gatekeeper, reader, "users:read:any")).toBe(true);
  });

  it("doesn't let one that isn't held be added", () => {
    expect(permissionEditable(gatekeeper, reader, "posts:create")).toBe(false);
  });

  // Taking a permission away gives nobody anything.
  it("lets one already on the role be taken away, held or not", () => {
    expect(permissionEditable(gatekeeper, writer, "posts:create")).toBe(true);
  });

  it("fixes every box on the admin role", () => {
    expect(permissionEditable(administrator, admin, "posts:create")).toBe(
      false
    );
  });

  it("follows what is held on a role not created yet", () => {
    expect(permissionEditable(gatekeeper, null, "comments:create")).toBe(true);
    expect(permissionEditable(gatekeeper, null, "posts:create")).toBe(false);
  });
});

describe("roleFormSchema", () => {
  const values = {
    name: "curator",
    description: "",
    permissions: [],
    is_default: false,
  };

  it.each([
    ["Curator", "curator"],
    ["  co_editor ", "co_editor"],
    ["ab", "ab"],
  ])("accepts the name %j as %j", (typed, stored) => {
    expect(roleFormSchema.parse({ ...values, name: typed }).name).toBe(stored);
  });

  it.each(["a", "x".repeat(41), "co-editor", "two words", ""])(
    "refuses the name %j",
    (name) => {
      expect(roleFormSchema.safeParse({ ...values, name }).success).toBe(false);
    }
  );

  it("refuses a description over 200 characters", () => {
    const description = "x".repeat(201);

    expect(roleFormSchema.safeParse({ ...values, description }).success).toBe(
      false
    );
  });
});

describe("toRoleCreate and toRoleUpdate", () => {
  const current = { ...writer, description: "Writes." };
  const same = {
    name: "writer",
    description: "Writes.",
    permissions: ["comments:create", "posts:create"],
    is_default: false,
  };

  it("creates with what was entered", () => {
    expect(toRoleCreate(same)).toEqual({
      name: "writer",
      description: "Writes.",
      permissions: ["comments:create", "posts:create"],
    });
  });

  it("sends nothing when nothing changed, permissions in another order included", () => {
    expect(toRoleUpdate(current, same)).toEqual({});
  });

  it("sends only what changed", () => {
    expect(
      toRoleUpdate(current, { ...same, permissions: ["comments:create"] })
    ).toEqual({ permissions: ["comments:create"] });
  });

  it("sends the default flag only to turn it on", () => {
    expect(toRoleUpdate(current, { ...same, is_default: true })).toEqual({
      is_default: true,
    });
    const isDefault = { ...current, is_default: true };
    expect(toRoleUpdate(isDefault, { ...same, is_default: false })).toEqual({});
  });
});
