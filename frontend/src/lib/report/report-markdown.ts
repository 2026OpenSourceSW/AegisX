import GithubSlugger from 'github-slugger';

import type { FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { StatusType } from '@/graphql/types';

import { buildFindingSummaryMarkdown, reportSummaryHeading } from './report-summary';

const reportHeadingStatusPattern = /^[✅❌⚡⏳📝]\s*/u;
const reportHeadingIdPattern = /^\d+\.\s*/u;
const markdownHeadingPattern = /^(#{1,6})\s+(.+)$/u;

type ReportAnchors = {
    contentHeadingAnchors: Map<string, TocHeading[]>;
    resultAnchor: string;
    subtaskAnchors: Map<string, string>;
    summaryHeadings: TocHeading[];
    taskAnchors: Map<string, string>;
};

type TocHeading = {
    readonly anchor: string;
    readonly level: number;
    readonly title: string;
};

const normalizeReportHeadingText = (content: string, reportIds: ReadonlySet<string>): string => {
    let normalized = content.trim();

    while (true) {
        const previous = normalized;
        const hadStatusPrefix = reportHeadingStatusPattern.test(normalized);
        normalized = normalized.replace(reportHeadingStatusPattern, '').trim();

        const idMatch = normalized.match(reportHeadingIdPattern);
        const idPrefix = idMatch?.[0].replace('.', '').trim();

        if (idPrefix && (hadStatusPrefix || reportIds.has(idPrefix))) {
            normalized = normalized.replace(reportHeadingIdPattern, '').trim();
        }

        if (normalized === previous) {
            break;
        }
    }

    return normalized || content.trim();
};

const getStatusLabel = (status: StatusType): string => {
    switch (status) {
        case StatusType.Created: {
            return '생성됨';
        }

        case StatusType.Failed: {
            return '실패';
        }

        case StatusType.Finished: {
            return '완료';
        }

        case StatusType.Running: {
            return '실행 중';
        }

        case StatusType.Waiting: {
            return '대기 중';
        }

        default: {
            return '상태 미확인';
        }
    }
};

const getFenceMarker = (line: string): null | string => {
    const fenceMatch = line.trimStart().match(/^(```+|~~~+)/u);

    return fenceMatch ? fenceMatch[1][0] : null;
};

const shiftMarkdownHeaders = (text: string, shiftBy: number, reportIds: ReadonlySet<string>): string => {
    let fenceMarker: null | string = null;

    return text
        .split('\n')
        .map((line) => {
            const nextFenceMarker = getFenceMarker(line);

            if (nextFenceMarker) {
                fenceMarker = fenceMarker === nextFenceMarker ? null : nextFenceMarker;

                return line;
            }

            if (fenceMarker) {
                return line;
            }

            const headingMatch = line.match(markdownHeadingPattern);

            if (!headingMatch) {
                return line;
            }

            const currentLevel = headingMatch[1].length;
            const newLevel = Math.min(currentLevel + shiftBy, 6);
            const newHashes = '#'.repeat(newLevel);

            return `${newHashes} ${normalizeReportHeadingText(headingMatch[2], reportIds)}`;
        })
        .join('\n');
};

const registerMarkdownHeadingAnchors = (
    slugger: GithubSlugger,
    text: string,
    reportIds: ReadonlySet<string>,
): TocHeading[] => {
    let fenceMarker: null | string = null;
    const headings: TocHeading[] = [];

    text.split('\n').forEach((line) => {
        const nextFenceMarker = getFenceMarker(line);

        if (nextFenceMarker) {
            fenceMarker = fenceMarker === nextFenceMarker ? null : nextFenceMarker;

            return;
        }

        if (fenceMarker) {
            return;
        }

        const headingMatch = line.match(markdownHeadingPattern);

        if (headingMatch) {
            const title = normalizeReportHeadingText(headingMatch[2], reportIds);
            headings.push({
                anchor: slugger.slug(title),
                level: headingMatch[1].length,
                title,
            });
        }
    });

    return headings;
};

const sortByNumericId = <T extends { id: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
        const numericA = Number(a.id);
        const numericB = Number(b.id);

        if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
            return numericA - numericB;
        }

        return a.id.localeCompare(b.id);
    });
};

const collectReportIds = (tasks: TaskFragmentFragment[], flow?: FlowFragmentFragment | null): Set<string> => {
    const ids = new Set<string>();

    if (flow) {
        ids.add(flow.id);
    }

    tasks.forEach((task) => {
        ids.add(task.id);
        task.subtasks?.forEach((subtask) => {
            ids.add(subtask.id);
        });
    });

    return ids;
};

const buildReportAnchors = (
    tasks: TaskFragmentFragment[],
    reportIds: ReadonlySet<string>,
    summaryMarkdown: string,
    flow?: FlowFragmentFragment | null,
): ReportAnchors => {
    const slugger = new GithubSlugger();
    const anchors: ReportAnchors = {
        contentHeadingAnchors: new Map(),
        resultAnchor: '',
        subtaskAnchors: new Map(),
        summaryHeadings: [],
        taskAnchors: new Map(),
    };

    if (flow) {
        slugger.slug(normalizeReportHeadingText(flow.title, reportIds));
    }

    if (!tasks || tasks.length === 0) {
        return anchors;
    }

    slugger.slug('목차');
    anchors.summaryHeadings = registerMarkdownHeadingAnchors(slugger, summaryMarkdown, reportIds);
    anchors.resultAnchor = slugger.slug('점검 결과');

    sortByNumericId(tasks).forEach((task) => {
        const taskTitle = normalizeReportHeadingText(task.title, reportIds);
        anchors.taskAnchors.set(task.id, slugger.slug(taskTitle));
        const taskContentHeadings: TocHeading[] = [];

        if (task.input?.trim()) {
            taskContentHeadings.push(
                ...registerMarkdownHeadingAnchors(slugger, task.input, reportIds).filter(
                    (heading) => heading.title !== taskTitle,
                ),
            );
        }

        if (task.result?.trim()) {
            taskContentHeadings.push(
                ...registerMarkdownHeadingAnchors(slugger, task.result, reportIds).filter(
                    (heading) => heading.title !== taskTitle,
                ),
            );
        }

        if (taskContentHeadings.length > 0) {
            anchors.contentHeadingAnchors.set(`task:${task.id}`, taskContentHeadings);
        }

        if (task.subtasks && task.subtasks.length > 0) {
            sortByNumericId(task.subtasks).forEach((subtask) => {
                const subtaskTitle = normalizeReportHeadingText(subtask.title, reportIds);
                const subtaskBodyAnchor = slugger.slug(subtaskTitle);
                anchors.subtaskAnchors.set(subtask.id, subtaskBodyAnchor);
                const subtaskContentHeadings: TocHeading[] = [];

                if (subtask.description?.trim()) {
                    subtaskContentHeadings.push(
                        ...registerMarkdownHeadingAnchors(slugger, subtask.description, reportIds).filter(
                            (heading) => heading.title !== subtaskTitle,
                        ),
                    );
                }

                if (subtask.result?.trim()) {
                    subtaskContentHeadings.push(
                        ...registerMarkdownHeadingAnchors(slugger, subtask.result, reportIds).filter(
                            (heading) => heading.title !== subtaskTitle,
                        ),
                    );
                }

                if (subtaskContentHeadings.length > 0) {
                    anchors.contentHeadingAnchors.set(`subtask:${subtask.id}`, subtaskContentHeadings);
                }
            });
        }
    });

    return anchors;
};

const generateTableOfContents = (
    tasks: TaskFragmentFragment[],
    flow: FlowFragmentFragment | null | undefined,
    anchors: ReportAnchors,
    reportIds: ReadonlySet<string>,
): string => {
    let toc = '';

    if (flow) {
        toc = `# ${normalizeReportHeadingText(flow.title, reportIds)}\n\n`;
    }

    if (!tasks || tasks.length === 0) {
        return toc;
    }

    toc += '## 목차\n\n';

    anchors.summaryHeadings.forEach((heading) => {
        const indent = heading.title === reportSummaryHeading ? '' : '  ';
        toc += `${indent}- [${heading.title}](#${heading.anchor})\n`;
    });

    toc += `- [점검 결과](#${anchors.resultAnchor || new GithubSlugger().slug('점검 결과')})\n`;

    const sortedTasks = sortByNumericId(tasks);

    sortedTasks.forEach((task) => {
        const taskTitle = normalizeReportHeadingText(task.title, reportIds);
        const taskAnchor = anchors.taskAnchors.get(task.id) ?? new GithubSlugger().slug(taskTitle);

        toc += `  - [${taskTitle}](#${taskAnchor})\n`;

        const taskContentHeadings = anchors.contentHeadingAnchors.get(`task:${task.id}`) ?? [];
        taskContentHeadings.forEach((heading) => {
            toc += `    - [${heading.title}](#${heading.anchor})\n`;
        });

        if (task.subtasks && task.subtasks.length > 0) {
            const sortedSubtasks = sortByNumericId(task.subtasks);

            sortedSubtasks.forEach((subtask) => {
                const subtaskTitle = normalizeReportHeadingText(subtask.title, reportIds);
                const subtaskAnchor = anchors.subtaskAnchors.get(subtask.id) ?? new GithubSlugger().slug(subtaskTitle);
                toc += `    - [${subtaskTitle}](#${subtaskAnchor})\n`;

                const subtaskContentHeadings = anchors.contentHeadingAnchors.get(`subtask:${subtask.id}`) ?? [];
                subtaskContentHeadings.forEach((heading) => {
                    toc += `      - [${heading.title}](#${heading.anchor})\n`;
                });
            });
        }
    });

    return `${toc}\n---\n\n`;
};

export const buildReportMarkdown = (tasks: TaskFragmentFragment[], flow?: FlowFragmentFragment | null): string => {
    const reportIds = collectReportIds(tasks ?? [], flow);

    if (!tasks || tasks.length === 0) {
        if (flow) {
            return `# ${normalizeReportHeadingText(flow.title, reportIds)}\n\nNo tasks available for this flow.`;
        }

        return 'No tasks available for this flow.';
    }

    const sortedTasks = sortByNumericId(tasks);
    const summaryMarkdown = buildFindingSummaryMarkdown(sortedTasks);
    const anchors = buildReportAnchors(sortedTasks, reportIds, summaryMarkdown, flow);

    let report = generateTableOfContents(sortedTasks, flow, anchors, reportIds);
    report += `${summaryMarkdown}\n\n`;
    report += '## 점검 결과\n\n';

    sortedTasks.forEach((task, taskIndex) => {
        const taskTitle = normalizeReportHeadingText(task.title, reportIds);
        report += `### ${taskTitle}\n\n`;
        report += `상태: ${getStatusLabel(task.status)}\n\n`;

        if (task.input?.trim()) {
            const shiftedInput = shiftMarkdownHeaders(task.input, 3, reportIds);
            report += `${shiftedInput}\n\n`;
        }

        if (task.result?.trim()) {
            const shiftedResult = shiftMarkdownHeaders(task.result, 3, reportIds);
            report += `---\n\n${shiftedResult}\n\n`;
        }

        if (task.subtasks && task.subtasks.length > 0) {
            const sortedSubtasks = sortByNumericId(task.subtasks);

            sortedSubtasks.forEach((subtask) => {
                const subtaskTitle = normalizeReportHeadingText(subtask.title, reportIds);
                report += `#### ${subtaskTitle}\n\n`;
                report += `상태: ${getStatusLabel(subtask.status)}\n\n`;

                if (subtask.description?.trim()) {
                    const shiftedDescription = shiftMarkdownHeaders(subtask.description, 4, reportIds);
                    report += `${shiftedDescription}\n\n`;
                }

                if (subtask.result?.trim()) {
                    const shiftedResult = shiftMarkdownHeaders(subtask.result, 4, reportIds);
                    report += `---\n\n${shiftedResult}\n\n`;
                }
            });
        }

        if (taskIndex < sortedTasks.length - 1) {
            report += '---\n\n';
        }
    });

    return report.trim();
};
