"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { SettingsDrawer } from "@/components/nav/SettingsDrawer";
import { CoachChat } from "./CoachChat";
import { MobileNav } from "./MobileNav";
import { PreferencesSync } from "./PreferencesSync";

/**
 * Signed-in app chrome shared by the dashboard and the library: preferences sync, settings,
 * the coach and the phone tab bar. Renders nothing for visitors.
 */
export function AppChrome() {
    const user = useAuthStore((s) => s.user);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !user) return null;
    return (
        <>
            <PreferencesSync />
            <SettingsDrawer />
            <CoachChat />
            <MobileNav />
        </>
    );
}
