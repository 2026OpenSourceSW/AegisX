import GithubSlugger from 'github-slugger';

import type { FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { StatusType } from '@/graphql/types';

const reportHeadingStatusPattern = /^[✅❌⚡⏳📝]\s*/u;
const reportHeadingIdPattern = /^\d+\.\s*/u;
const markdownHeadingPattern = /^(#{1,6})\s+(.+)$/u;

type ReportAnchors = {
    subtaskAnchors: Map<string, string>;
    taskAnchors: Map<string, string>;
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

const registerMarkdownHeadingAnchors = (slugger: GithubSlugger, text: string, reportIds: ReadonlySet<string>): void => {
    let fenceMarker: null | string = null;

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
            slugger.slug(normalizeReportHeadingText(headingMatch[2], reportIds));
        }
    });
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
    flow?: FlowFragmentFragment | null,
): ReportAnchors => {
    const slugger = new GithubSlugger();
    const anchors: ReportAnchors = {
        subtaskAnchors: new Map(),
        taskAnchors: new Map(),
    };

    if (flow) {
        slugger.slug(normalizeReportHeadingText(flow.title, reportIds));
    }

    if (!tasks || tasks.length === 0) {
        return anchors;
    }

    slugger.slug('목차');
    slugger.slug('점검 결과');

    sortByNumericId(tasks).forEach((task) => {
        anchors.taskAnchors.set(task.id, slugger.slug(normalizeReportHeadingText(task.title, reportIds)));

        if (task.input?.trim()) {
            registerMarkdownHeadingAnchors(slugger, task.input, reportIds);
        }

        if (task.result?.trim()) {
            registerMarkdownHeadingAnchors(slugger, task.result, reportIds);
        }

        if (task.subtasks && task.subtasks.length > 0) {
            sortByNumericId(task.subtasks).forEach((subtask) => {
                const subtaskTitle = normalizeReportHeadingText(subtask.title, reportIds);
                const subtaskBodyAnchor = slugger.slug(subtaskTitle);
                anchors.subtaskAnchors.set(subtask.id, subtaskBodyAnchor);

                if (subtask.description?.trim()) {
                    registerMarkdownHeadingAnchors(slugger, subtask.description, reportIds);
                }

                if (subtask.result?.trim()) {
                    registerMarkdownHeadingAnchors(slugger, subtask.result, reportIds);
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

    const sortedTasks = sortByNumericId(tasks);

    sortedTasks.forEach((task) => {
        const taskTitle = normalizeReportHeadingText(task.title, reportIds);
        const taskAnchor = anchors.taskAnchors.get(task.id) ?? new GithubSlugger().slug(taskTitle);

        toc += `- [${taskTitle}](#${taskAnchor})\n`;

        if (task.subtasks && task.subtasks.length > 0) {
            const sortedSubtasks = sortByNumericId(task.subtasks);

            sortedSubtasks.forEach((subtask) => {
                const subtaskTitle = normalizeReportHeadingText(subtask.title, reportIds);
                const subtaskAnchor = anchors.subtaskAnchors.get(subtask.id) ?? new GithubSlugger().slug(subtaskTitle);
                toc += `  - [${subtaskTitle}](#${subtaskAnchor})\n`;
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
    const anchors = buildReportAnchors(sortedTasks, reportIds, flow);

    let report = generateTableOfContents(sortedTasks, flow, anchors, reportIds);
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
