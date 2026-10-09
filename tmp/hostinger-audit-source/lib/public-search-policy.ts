/** Public discovery controls depend on the complete dataset, never filtered results. */
export function publicSearchPolicy(kind:string,count:number,categoryCount=0){
 const archive=['berita','pustaka'].includes(kind),large=count>30,medium=count>12;
 return {search:archive||large,categories:categoryCount>1&&(archive||kind==='galeri'||medium),statuses:kind==='donasi'&&medium,paginate:archive||large,pageSize:12};
}
