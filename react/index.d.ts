import { AjaxConfig, Interceptor } from '../index';
import { Service } from '../dist';
export declare function connect(connector: Record<string, typeof Service>): (target: any) => {
    new (...a: any[]): {
        [x: string]: any;
        componentWillUnmount(): void;
    };
    [x: string]: any;
};
export declare function useService<T extends Service>(service: {
    new (config?: AjaxConfig, interceptor?: Interceptor): T;
}): T;
