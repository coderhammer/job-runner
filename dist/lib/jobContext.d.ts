export interface JobContext {
    jobId: string;
    isJobRoot: boolean;
}
export declare function setJobContext(span: object, ctx: JobContext): void;
export declare function getJobContext(span: object): JobContext | undefined;
