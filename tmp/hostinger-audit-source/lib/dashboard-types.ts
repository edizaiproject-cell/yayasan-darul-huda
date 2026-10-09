export type DashboardTarget={module:string;id?:string;status?:string;create?:boolean;filters?:Record<string,string>};
export type DashboardItem={label:string;value:string|number;helper?:string;target:DashboardTarget;icon:string};
export type DashboardData={generatedAt:string;month:string;stats:DashboardItem[];highlights:DashboardItem[];attention:DashboardItem[];activities:{id:number;label:string;title:string;date:string;target:DashboardTarget;icon:string}[]};
