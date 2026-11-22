import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import type { RolePublic, UserAdmin, UserMe } from "@/api/generated/types.gen";
import { describeError } from "@/features/auth/form-errors";
import { canAssignRole } from "@/features/rbac/grants";
import { adminActions } from "@/features/rbac/mutations";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";

/**
 * Choose an account's roles. A role whose permissions the administrator
 * doesn't hold can be neither given nor taken away, so its box is fixed.
 */
export function RolesDialog({
  user,
  roles,
  me,
  open,
  onOpenChange,
}: {
  user: UserAdmin;
  roles: RolePublic[];
  me: UserMe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState(() => user.roles.map((role) => role.id));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const someFixed = roles.some((role) => !canAssignRole(me, role));

  const toggle = (id: string, on: boolean) =>
    setChosen((now) => (on ? [...now, id] : now.filter((kept) => kept !== id)));

  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      await adminActions(queryClient).assignRoles(user, chosen);
      onOpenChange(false);
    } catch (error) {
      // "This would leave no active admin", for one, as the API words it.
      setProblem(describeError(error));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roles of {user.username}</DialogTitle>
          <DialogDescription>
            What they may do changes on their next request.
            {someFixed
              ? " A greyed-out role carries permissions you don't hold, so you can't give it or take it away."
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {roles.map((role) => {
            const id = `role-${user.id}-${role.id}`;
            return (
              <Field
                key={role.id}
                orientation="horizontal"
                className="min-h-11"
              >
                <Checkbox
                  id={id}
                  checked={chosen.includes(role.id)}
                  disabled={!canAssignRole(me, role)}
                  onCheckedChange={(on) => toggle(role.id, on === true)}
                />
                <FieldLabel htmlFor={id} className="flex-col items-start gap-0">
                  <span>{role.name}</span>
                  {role.description ? (
                    <span className="font-normal text-muted-foreground">
                      {role.description}
                    </span>
                  ) : null}
                </FieldLabel>
              </Field>
            );
          })}
        </div>
        {problem ? (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving" : "Save roles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
