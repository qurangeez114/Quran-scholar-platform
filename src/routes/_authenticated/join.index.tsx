import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Card } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/join/")({
  head: () => ({ meta: [{ title: "Join a circle" }, { name: "robots", content: "noindex" }] }),
  component: JoinCode,
});

function JoinCode() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Join a circle" subtitle="Enter the private code your organizer shared with you." />
      <Card className="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (c) navigate({ to: "/join/$code", params: { code: c } }); }} className="space-y-4">
          <Input className="h-12 text-center font-mono text-lg tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="ABCD2345EFGH" aria-label="Invite code" />
          <Button className="h-11 w-full rounded-xl">View invite</Button>
        </form>
      </Card>
    </>
  );
}