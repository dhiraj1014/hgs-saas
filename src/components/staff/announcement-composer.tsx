"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldHint,
  FieldLabel,
  FieldTextarea,
  FormActions,
  FormCard,
} from "@/components/ui/field";
import { submitAnnouncement } from "@/server/announcements";
import { AudiencePicker, type AudienceState } from "./audience-picker";

type Klass = { id: string; name: string };
type Section = { id: string; name: string; className: string | null };

const SMS_SEGMENT = 160;

export function AnnouncementComposer({
  classes,
  sections,
  allowSchoolWide,
}: {
  classes: Klass[];
  sections: Section[];
  allowSchoolWide: boolean;
}) {
  const [audience, setAudience] = useState<AudienceState>({ type: "section", sectionId: sections[0]?.id ?? "" });
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSend() {
    const payload =
      audience.type === "school"
        ? { audienceType: "school", body }
        : audience.type === "class"
          ? { audienceType: "class", classId: audience.classId, body }
          : { audienceType: "section", sectionId: audience.sectionId, body };
    startTransition(async () => {
      try {
        const result = await submitAnnouncement(payload);
        toast.success("Announcement sent", {
          description: `Sent to ${result.recipientCount} · notified ${result.notified}${
            result.failed > 0 ? ` · ${result.failed} failed` : ""
          }`,
        });
        setBody("");
      } catch (e) {
        toast.error("Send failed", {
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
    });
  }

  const charCount = body.length;
  const segments = charCount === 0 ? 0 : Math.ceil(charCount / SMS_SEGMENT);

  return (
    <FormCard>
      <div className="grid gap-8 lg:grid-cols-2">
        <Field>
          <FieldLabel>Audience</FieldLabel>
          <AudiencePicker
            classes={classes}
            sections={sections}
            value={audience}
            onChange={setAudience}
            allowSchoolWide={allowSchoolWide}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="body" required>Message</FieldLabel>
          <FieldTextarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Type your announcement…"
            className="min-h-[180px]"
          />
          <div className="flex items-center justify-between">
            <FieldHint>SMS is 160 characters per segment.</FieldHint>
            <span className="text-[11px] text-mute">
              {charCount} chars{segments > 0 && ` · ${segments} SMS`}
            </span>
          </div>
        </Field>
      </div>

      <FormActions>
        <Button
          onClick={handleSend}
          variant="saffron"
          disabled={pending || !body.trim()}
          className="h-10 px-5 text-sm"
        >
          <Send className="size-3.5" /> {pending ? "Sending…" : "Send announcement"}
        </Button>
      </FormActions>
    </FormCard>
  );
}
