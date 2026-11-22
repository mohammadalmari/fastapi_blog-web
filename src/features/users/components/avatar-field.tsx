import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/errors";
import { usersReadMeQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { usersDeleteAvatar, usersUploadAvatar } from "@/api/generated/sdk.gen";
import type { UserMe } from "@/api/generated/types.gen";
import { describeError } from "@/features/auth/form-errors";
import { AVATAR_TYPES, avatarProblem } from "@/features/users/avatar";
import { UserAvatar } from "@/features/users/components/author";

import { Button } from "@/components/ui/button";

/**
 * The account's picture, with buttons to replace or remove it. A chosen
 * file is checked before it is sent; the API checks again, re-encodes it
 * and answers with where the new picture is served.
 */
export function AvatarField({ me }: { me: UserMe }) {
  const queryClient = useQueryClient();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const done = (updated: UserMe) => {
    queryClient.setQueryData(usersReadMeQueryKey(), updated);
    // The picture is shown next to posts and comments everywhere.
    void queryClient.invalidateQueries();
  };

  const fail = (error: unknown) => {
    const reason =
      error instanceof ApiError ? error.fields.file?.join(" ") : undefined;
    setProblem(reason ?? describeError(error));
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so that choosing the same file again is still a change.
    event.target.value = "";
    if (!file) return;

    const refused = avatarProblem(file);
    if (refused) return setProblem(refused);

    setProblem(null);
    setBusy("upload");
    try {
      const { data } = await usersUploadAvatar({
        body: { file },
        throwOnError: true,
      });
      done(data);
    } catch (error) {
      fail(error);
    }
    setBusy(null);
  };

  const remove = async () => {
    setProblem(null);
    setBusy("remove");
    try {
      await usersDeleteAvatar({ throwOnError: true });
      done({ ...me, avatar_url: null });
    } catch (error) {
      fail(error);
    }
    setBusy(null);
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <UserAvatar person={me} size="lg" className="size-24! text-2xl" />
      <input
        ref={picker}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        aria-label="Choose a picture"
        className="sr-only"
        onChange={upload}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={busy !== null}
        onClick={() => picker.current?.click()}
      >
        {busy === "upload"
          ? "Uploading"
          : me.avatar_url
            ? "Change picture"
            : "Add a picture"}
      </Button>
      {me.avatar_url ? (
        <Button
          type="button"
          variant="link"
          className="h-11 px-0 text-destructive"
          disabled={busy !== null}
          onClick={remove}
        >
          {busy === "remove" ? "Removing" : "Remove picture"}
        </Button>
      ) : null}
      <p
        role={problem ? "alert" : undefined}
        className={problem ? "text-destructive" : undefined}
      >
        {problem ?? "PNG, JPEG or WebP, up to 2 MB."}
      </p>
    </div>
  );
}
