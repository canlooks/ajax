import { HttpService } from '../dist';
export declare function connect(connector: Record<string, typeof HttpService>): (target: any) => {
    new (...a: any[]): {
        [x: string]: any;
        componentWillUnmount(): void;
    };
    [x: string]: any;
};
export declare function useService<T extends HttpService>(service: {
    new (): T;
}): T;
