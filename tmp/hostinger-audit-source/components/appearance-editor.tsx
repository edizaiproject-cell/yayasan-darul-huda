'use client';
import {AppearanceBuilder} from './appearance-builder';
import {NavigationBuilder} from './navigation-builder';
export function AppearanceEditor(p:Parameters<typeof AppearanceBuilder>[0]){return p.module==='menu_items'?<NavigationBuilder {...p}/>:<AppearanceBuilder {...p}/>}
