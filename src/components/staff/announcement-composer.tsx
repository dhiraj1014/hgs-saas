"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitAnnouncement } from "@/server/announcements";
import { AudiencePicker, type AudienceState } from "./audience-picker";

type Klass = { id: string; name: string };
type Section = { id: string; name: string; className: string | null };

export function AnnouncementComposer({ classes, sections, allowSchoolWide }: {
  classes: Klass[]; sections: Section[]; allowSchoolWide: boolean;
}) {
  const [audience, setAudience] = useState<AudienceState>({ type: "section", sectionId: sections[0]?.id ?? "" });
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function handleSend() {
    const payload =
      audience.type === "school" ? { audienceType: "school", body } :
      audience.type === "class" ? { audienceType: "class", classId: audience.classId, body } :
      { audienceType: "section", sectionId: audience.sectionId, body };
    startTransition(async () => {
      try {
        const result = await submitAnnouncement(payload);
        setToast(`Sent to ${result.recipientCount}, notified ${result.notified}, ${result.failed} failed`);
        setBody("");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Send failed");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium mb-2">Audience</label>
        <AudiencePicker classes={classes} sections={sections} value={audience} onChange={setAudience} allowSchoolWide={allowSchoolWide} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full border border-rule rounded px-3 py-2" />
        <p className="text-xs text-mute mt-1">Keep it short — SMS is 160 chars per segment.</p>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={handleSend} disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
        {toast && <span className="text-sm text-mute">{toast}</span>}
      </div>
    </div>
  );
}
