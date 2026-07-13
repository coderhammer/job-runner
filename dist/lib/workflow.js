export function getWorkflow(workflows, id) {
    return workflows.find((w) => w.id === id);
}
