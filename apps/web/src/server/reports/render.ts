import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { WeeklyReportPdf } from "./WeeklyReportPdf";
import type { WeeklyReportData } from "./weekly-data";

export async function renderWeeklyPdf(data: WeeklyReportData): Promise<Buffer> {
    return renderToBuffer(createElement(WeeklyReportPdf, { data }) as unknown as ReactElement<DocumentProps>);
}

export const reportFilename = (data: WeeklyReportData) => `hagit-weekly-${data.week.key}.pdf`;
