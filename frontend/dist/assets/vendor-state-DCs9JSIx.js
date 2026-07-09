var Je=Object.defineProperty;var He=(e,t,r)=>t in e?Je(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r;var re=(e,t,r)=>He(e,typeof t!="symbol"?t+"":t,r);import{r as s,w as Ke,R as Ge}from"./vendor-react-DafOY3sG.js";import{i as T,g as ce,r as de,j as K,A as Se,p as Pe,s as F,m as Xe,a as Qe,c as me,b as Ye,d as ve,h as N,u as Ze,w as U,e as et,f as tt,k as Te,l as ke,n as rt,o as nt,q as at,t as ot,v as it,x as ie,y as st,z as lt}from"./vendor-misc-Y0KNkUPi.js";function ut(e){e()}function ct(){let e=null,t=null;return{clear(){e=null,t=null},notify(){ut(()=>{let r=e;for(;r;)r.callback(),r=r.next})},get(){const r=[];let n=e;for(;n;)r.push(n),n=n.next;return r},subscribe(r){let n=!0;const a=t={callback:r,next:null,prev:t};return a.prev?a.prev.next=a:e=a,function(){!n||e===null||(n=!1,a.next?a.next.prev=a.prev:t=a.prev,a.prev?a.prev.next=a.next:e=a.next)}}}}var ye={notify(){},get:()=>[]};function dt(e,t){let r,n=ye,a=0,i=!1;function o(b){l();const g=n.subscribe(b);let E=!1;return()=>{E||(E=!0,g(),u())}}function f(){n.notify()}function c(){y.onStateChange&&y.onStateChange()}function d(){return i}function l(){a++,r||(r=e.subscribe(c),n=ct())}function u(){a--,r&&a===0&&(r(),r=void 0,n.clear(),n=ye)}function p(){i||(i=!0,l())}function h(){i&&(i=!1,u())}const y={addNestedSub:o,notifyNestedSubs:f,handleChangeWrapper:c,isSubscribed:d,trySubscribe:p,tryUnsubscribe:h,getListeners:()=>n};return y}var ft=()=>typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",pt=ft(),ht=()=>typeof navigator<"u"&&navigator.product==="ReactNative",mt=ht(),vt=()=>pt||mt?s.useLayoutEffect:s.useEffect,yt=vt(),ne=Symbol.for("react-redux-context"),ae=typeof globalThis<"u"?globalThis:{};function gt(){if(!s.createContext)return{};const e=ae[ne]??(ae[ne]=new Map);let t=e.get(s.createContext);return t||(t=s.createContext(null),e.set(s.createContext,t)),t}var A=gt();function bt(e){const{children:t,context:r,serverState:n,store:a}=e,i=s.useMemo(()=>{const c=dt(a);return{store:a,subscription:c,getServerState:n?()=>n:void 0}},[a,n]),o=s.useMemo(()=>a.getState(),[a]);yt(()=>{const{subscription:c}=i;return c.onStateChange=c.notifyNestedSubs,c.trySubscribe(),o!==a.getState()&&c.notifyNestedSubs(),()=>{c.tryUnsubscribe(),c.onStateChange=void 0}},[i,o]);const f=r||A;return s.createElement(f.Provider,{value:i},t)}var hn=bt;function fe(e=A){return function(){return s.useContext(e)}}var De=fe();function Oe(e=A){const t=e===A?De:fe(e),r=()=>{const{store:n}=t();return n};return Object.assign(r,{withTypes:()=>r}),r}var xt=Oe();function Ct(e=A){const t=e===A?xt:Oe(e),r=()=>t().dispatch;return Object.assign(r,{withTypes:()=>r}),r}var mn=Ct(),wt=(e,t)=>e===t;function Et(e=A){const t=e===A?De:fe(e),r=(n,a={})=>{const{equalityFn:i=wt}=typeof a=="function"?{equalityFn:a}:a,o=t(),{store:f,subscription:c,getServerState:d}=o;s.useRef(!0);const l=s.useCallback({[n.name](p){return n(p)}}[n.name],[n]),u=Ke.useSyncExternalStoreWithSelector(c.addNestedSub,f.getState,d||f.getState,l,i);return s.useDebugValue(u),u};return Object.assign(r,{withTypes:()=>r}),r}var vn=Et();/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function z(){return z=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n])}return e},z.apply(this,arguments)}const Q=s.createContext(null),je=s.createContext(null),M=s.createContext(null),Y=s.createContext(null),j=s.createContext({outlet:null,matches:[],isDataRoute:!1}),Le=s.createContext(null);function Rt(e,t){let{relative:r}=t===void 0?{}:t;I()||T(!1);let{basename:n,navigator:a}=s.useContext(M),{hash:i,pathname:o,search:f}=Z(e,{relative:r}),c=o;return n!=="/"&&(c=o==="/"?n:K([n,o])),a.createHref({pathname:c,search:f,hash:i})}function I(){return s.useContext(Y)!=null}function _(){return I()||T(!1),s.useContext(Y).location}function Ne(e){s.useContext(M).static||s.useLayoutEffect(e)}function pe(){let{isDataRoute:e}=s.useContext(j);return e?Bt():St()}function St(){I()||T(!1);let e=s.useContext(Q),{basename:t,future:r,navigator:n}=s.useContext(M),{matches:a}=s.useContext(j),{pathname:i}=_(),o=JSON.stringify(ce(a,r.v7_relativeSplatPath)),f=s.useRef(!1);return Ne(()=>{f.current=!0}),s.useCallback(function(d,l){if(l===void 0&&(l={}),!f.current)return;if(typeof d=="number"){n.go(d);return}let u=de(d,JSON.parse(o),i,l.relative==="path");e==null&&t!=="/"&&(u.pathname=u.pathname==="/"?t:K([t,u.pathname])),(l.replace?n.replace:n.push)(u,l.state,l)},[t,n,o,i,e])}const Pt=s.createContext(null);function Tt(e){let t=s.useContext(j).outlet;return t&&s.createElement(Pt.Provider,{value:e},t)}function yn(){let{matches:e}=s.useContext(j),t=e[e.length-1];return t?t.params:{}}function Z(e,t){let{relative:r}=t===void 0?{}:t,{future:n}=s.useContext(M),{matches:a}=s.useContext(j),{pathname:i}=_(),o=JSON.stringify(ce(a,n.v7_relativeSplatPath));return s.useMemo(()=>de(e,JSON.parse(o),i,r==="path"),[e,o,i,r])}function kt(e,t){return Dt(e,t)}function Dt(e,t,r,n){I()||T(!1);let{navigator:a}=s.useContext(M),{matches:i}=s.useContext(j),o=i[i.length-1],f=o?o.params:{};o&&o.pathname;let c=o?o.pathnameBase:"/";o&&o.route;let d=_(),l;if(t){var u;let g=typeof t=="string"?Pe(t):t;c==="/"||(u=g.pathname)!=null&&u.startsWith(c)||T(!1),l=g}else l=d;let p=l.pathname||"/",h=p;if(c!=="/"){let g=c.replace(/^\//,"").split("/");h="/"+p.replace(/^\//,"").split("/").slice(g.length).join("/")}let y=Xe(e,{pathname:h}),b=Mt(y&&y.map(g=>Object.assign({},g,{params:Object.assign({},f,g.params),pathname:K([c,a.encodeLocation?a.encodeLocation(g.pathname).pathname:g.pathname]),pathnameBase:g.pathnameBase==="/"?c:K([c,a.encodeLocation?a.encodeLocation(g.pathnameBase).pathname:g.pathnameBase])})),i,r,n);return t&&b?s.createElement(Y.Provider,{value:{location:z({pathname:"/",search:"",hash:"",state:null,key:"default"},l),navigationType:Se.Pop}},b):b}function Ot(){let e=It(),t=Qe(e)?e.status+" "+e.statusText:e instanceof Error?e.message:JSON.stringify(e),r=e instanceof Error?e.stack:null,a={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return s.createElement(s.Fragment,null,s.createElement("h2",null,"Unexpected Application Error!"),s.createElement("h3",{style:{fontStyle:"italic"}},t),r?s.createElement("pre",{style:a},r):null,null)}const jt=s.createElement(Ot,null);class Lt extends s.Component{constructor(t){super(t),this.state={location:t.location,revalidation:t.revalidation,error:t.error}}static getDerivedStateFromError(t){return{error:t}}static getDerivedStateFromProps(t,r){return r.location!==t.location||r.revalidation!=="idle"&&t.revalidation==="idle"?{error:t.error,location:t.location,revalidation:t.revalidation}:{error:t.error!==void 0?t.error:r.error,location:r.location,revalidation:t.revalidation||r.revalidation}}componentDidCatch(t,r){console.error("React Router caught the following error during render",t,r)}render(){return this.state.error!==void 0?s.createElement(j.Provider,{value:this.props.routeContext},s.createElement(Le.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function Nt(e){let{routeContext:t,match:r,children:n}=e,a=s.useContext(Q);return a&&a.static&&a.staticContext&&(r.route.errorElement||r.route.ErrorBoundary)&&(a.staticContext._deepestRenderedBoundaryId=r.route.id),s.createElement(j.Provider,{value:t},n)}function Mt(e,t,r,n){var a;if(t===void 0&&(t=[]),r===void 0&&(r=null),n===void 0&&(n=null),e==null){var i;if(!r)return null;if(r.errors)e=r.matches;else if((i=n)!=null&&i.v7_partialHydration&&t.length===0&&!r.initialized&&r.matches.length>0)e=r.matches;else return null}let o=e,f=(a=r)==null?void 0:a.errors;if(f!=null){let l=o.findIndex(u=>u.route.id&&(f==null?void 0:f[u.route.id])!==void 0);l>=0||T(!1),o=o.slice(0,Math.min(o.length,l+1))}let c=!1,d=-1;if(r&&n&&n.v7_partialHydration)for(let l=0;l<o.length;l++){let u=o[l];if((u.route.HydrateFallback||u.route.hydrateFallbackElement)&&(d=l),u.route.id){let{loaderData:p,errors:h}=r,y=u.route.loader&&p[u.route.id]===void 0&&(!h||h[u.route.id]===void 0);if(u.route.lazy||y){c=!0,d>=0?o=o.slice(0,d+1):o=[o[0]];break}}}return o.reduceRight((l,u,p)=>{let h,y=!1,b=null,g=null;r&&(h=f&&u.route.id?f[u.route.id]:void 0,b=u.route.errorElement||jt,c&&(d<0&&p===0?($t("route-fallback"),y=!0,g=null):d===p&&(y=!0,g=u.route.hydrateFallbackElement||null)));let E=t.concat(o.slice(0,p+1)),w=()=>{let v;return h?v=b:y?v=g:u.route.Component?v=s.createElement(u.route.Component,null):u.route.element?v=u.route.element:v=l,s.createElement(Nt,{match:u,routeContext:{outlet:l,matches:E,isDataRoute:r!=null},children:v})};return r&&(u.route.ErrorBoundary||u.route.errorElement||p===0)?s.createElement(Lt,{location:r.location,revalidation:r.revalidation,component:b,error:h,children:w(),routeContext:{outlet:null,matches:E,isDataRoute:!0}}):w()},null)}var Me=function(e){return e.UseBlocker="useBlocker",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e}(Me||{}),Ae=function(e){return e.UseBlocker="useBlocker",e.UseLoaderData="useLoaderData",e.UseActionData="useActionData",e.UseRouteError="useRouteError",e.UseNavigation="useNavigation",e.UseRouteLoaderData="useRouteLoaderData",e.UseMatches="useMatches",e.UseRevalidator="useRevalidator",e.UseNavigateStable="useNavigate",e.UseRouteId="useRouteId",e}(Ae||{});function At(e){let t=s.useContext(Q);return t||T(!1),t}function Ut(e){let t=s.useContext(je);return t||T(!1),t}function _t(e){let t=s.useContext(j);return t||T(!1),t}function Ue(e){let t=_t(),r=t.matches[t.matches.length-1];return r.route.id||T(!1),r.route.id}function It(){var e;let t=s.useContext(Le),r=Ut(),n=Ue();return t!==void 0?t:(e=r.errors)==null?void 0:e[n]}function Bt(){let{router:e}=At(Me.UseNavigateStable),t=Ue(Ae.UseNavigateStable),r=s.useRef(!1);return Ne(()=>{r.current=!0}),s.useCallback(function(a,i){i===void 0&&(i={}),r.current&&(typeof a=="number"?e.navigate(a):e.navigate(a,z({fromRouteId:t},i)))},[e,t])}const ge={};function $t(e,t,r){ge[e]||(ge[e]=!0)}function Ft(e,t){e==null||e.v7_startTransition,e==null||e.v7_relativeSplatPath}function gn(e){let{to:t,replace:r,state:n,relative:a}=e;I()||T(!1);let{future:i,static:o}=s.useContext(M),{matches:f}=s.useContext(j),{pathname:c}=_(),d=pe(),l=de(t,ce(f,i.v7_relativeSplatPath),c,a==="path"),u=JSON.stringify(l);return s.useEffect(()=>d(JSON.parse(u),{replace:r,state:n,relative:a}),[d,u,a,r,n]),null}function bn(e){return Tt(e.context)}function zt(e){T(!1)}function Vt(e){let{basename:t="/",children:r=null,location:n,navigationType:a=Se.Pop,navigator:i,static:o=!1,future:f}=e;I()&&T(!1);let c=t.replace(/^\/*/,"/"),d=s.useMemo(()=>({basename:c,navigator:i,static:o,future:z({v7_relativeSplatPath:!1},f)}),[c,f,i,o]);typeof n=="string"&&(n=Pe(n));let{pathname:l="/",search:u="",hash:p="",state:h=null,key:y="default"}=n,b=s.useMemo(()=>{let g=F(l,c);return g==null?null:{location:{pathname:g,search:u,hash:p,state:h,key:y},navigationType:a}},[c,l,u,p,h,y,a]);return b==null?null:s.createElement(M.Provider,{value:d},s.createElement(Y.Provider,{children:r,value:b}))}function xn(e){let{children:t,location:r}=e;return kt(se(t),r)}new Promise(()=>{});function se(e,t){t===void 0&&(t=[]);let r=[];return s.Children.forEach(e,(n,a)=>{if(!s.isValidElement(n))return;let i=[...t,a];if(n.type===s.Fragment){r.push.apply(r,se(n.props.children,i));return}n.type!==zt&&T(!1),!n.props.index||!n.props.children||T(!1);let o={id:n.props.id||i.join("-"),caseSensitive:n.props.caseSensitive,element:n.props.element,Component:n.props.Component,index:n.props.index,path:n.props.path,loader:n.props.loader,action:n.props.action,errorElement:n.props.errorElement,ErrorBoundary:n.props.ErrorBoundary,hasErrorBoundary:n.props.ErrorBoundary!=null||n.props.errorElement!=null,shouldRevalidate:n.props.shouldRevalidate,handle:n.props.handle,lazy:n.props.lazy};n.props.children&&(o.children=se(n.props.children,i)),r.push(o)}),r}/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function G(){return G=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n])}return e},G.apply(this,arguments)}function _e(e,t){if(e==null)return{};var r={},n=Object.keys(e),a,i;for(i=0;i<n.length;i++)a=n[i],!(t.indexOf(a)>=0)&&(r[a]=e[a]);return r}function Wt(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function qt(e,t){return e.button===0&&(!t||t==="_self")&&!Wt(e)}function le(e){return e===void 0&&(e=""),new URLSearchParams(typeof e=="string"||Array.isArray(e)||e instanceof URLSearchParams?e:Object.keys(e).reduce((t,r)=>{let n=e[r];return t.concat(Array.isArray(n)?n.map(a=>[r,a]):[[r,n]])},[]))}function Jt(e,t){let r=le(e);return t&&t.forEach((n,a)=>{r.has(a)||t.getAll(a).forEach(i=>{r.append(a,i)})}),r}const Ht=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],Kt=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],Gt="6";try{window.__reactRouterVersion=Gt}catch{}const Xt=s.createContext({isTransitioning:!1}),Qt="startTransition",be=Ge[Qt];function Cn(e){let{basename:t,children:r,future:n,window:a}=e,i=s.useRef();i.current==null&&(i.current=Ye({window:a,v5Compat:!0}));let o=i.current,[f,c]=s.useState({action:o.action,location:o.location}),{v7_startTransition:d}=n||{},l=s.useCallback(u=>{d&&be?be(()=>c(u)):c(u)},[c,d]);return s.useLayoutEffect(()=>o.listen(l),[o,l]),s.useEffect(()=>Ft(n),[n]),s.createElement(Vt,{basename:t,children:r,location:f.location,navigationType:f.action,navigator:o,future:n})}const Yt=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",Zt=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,er=s.forwardRef(function(t,r){let{onClick:n,relative:a,reloadDocument:i,replace:o,state:f,target:c,to:d,preventScrollReset:l,viewTransition:u}=t,p=_e(t,Ht),{basename:h}=s.useContext(M),y,b=!1;if(typeof d=="string"&&Zt.test(d)&&(y=d,Yt))try{let v=new URL(window.location.href),m=d.startsWith("//")?new URL(v.protocol+d):new URL(d),x=F(m.pathname,h);m.origin===v.origin&&x!=null?d=x+m.search+m.hash:b=!0}catch{}let g=Rt(d,{relative:a}),E=rr(d,{replace:o,state:f,target:c,preventScrollReset:l,relative:a,viewTransition:u});function w(v){n&&n(v),v.defaultPrevented||E(v)}return s.createElement("a",G({},p,{href:y||g,onClick:b||i?n:w,ref:r,target:c}))}),wn=s.forwardRef(function(t,r){let{"aria-current":n="page",caseSensitive:a=!1,className:i="",end:o=!1,style:f,to:c,viewTransition:d,children:l}=t,u=_e(t,Kt),p=Z(c,{relative:u.relative}),h=_(),y=s.useContext(je),{navigator:b,basename:g}=s.useContext(M),E=y!=null&&nr(p)&&d===!0,w=b.encodeLocation?b.encodeLocation(p).pathname:p.pathname,v=h.pathname,m=y&&y.navigation&&y.navigation.location?y.navigation.location.pathname:null;a||(v=v.toLowerCase(),m=m?m.toLowerCase():null,w=w.toLowerCase()),m&&g&&(m=F(m,g)||m);const x=w!=="/"&&w.endsWith("/")?w.length-1:w.length;let R=v===w||!o&&v.startsWith(w)&&v.charAt(x)==="/",S=m!=null&&(m===w||!o&&m.startsWith(w)&&m.charAt(w.length)==="/"),k={isActive:R,isPending:S,isTransitioning:E},C=R?n:void 0,D;typeof i=="function"?D=i(k):D=[i,R?"active":null,S?"pending":null,E?"transitioning":null].filter(Boolean).join(" ");let te=typeof f=="function"?f(k):f;return s.createElement(er,G({},u,{"aria-current":C,className:D,ref:r,style:te,to:c,viewTransition:d}),typeof l=="function"?l(k):l)});var ue;(function(e){e.UseScrollRestoration="useScrollRestoration",e.UseSubmit="useSubmit",e.UseSubmitFetcher="useSubmitFetcher",e.UseFetcher="useFetcher",e.useViewTransitionState="useViewTransitionState"})(ue||(ue={}));var xe;(function(e){e.UseFetcher="useFetcher",e.UseFetchers="useFetchers",e.UseScrollRestoration="useScrollRestoration"})(xe||(xe={}));function tr(e){let t=s.useContext(Q);return t||T(!1),t}function rr(e,t){let{target:r,replace:n,state:a,preventScrollReset:i,relative:o,viewTransition:f}=t===void 0?{}:t,c=pe(),d=_(),l=Z(e,{relative:o});return s.useCallback(u=>{if(qt(u,r)){u.preventDefault();let p=n!==void 0?n:me(d)===me(l);c(e,{replace:p,state:a,preventScrollReset:i,relative:o,viewTransition:f})}},[d,c,l,n,a,r,e,i,o,f])}function En(e){let t=s.useRef(le(e)),r=s.useRef(!1),n=_(),a=s.useMemo(()=>Jt(n.search,r.current?null:t.current),[n.search]),i=pe(),o=s.useCallback((f,c)=>{const d=le(typeof f=="function"?f(a):f);r.current=!0,i("?"+d,c)},[i,a]);return[a,o]}function nr(e,t){t===void 0&&(t={});let r=s.useContext(Xt);r==null&&T(!1);let{basename:n}=tr(ue.useViewTransitionState),a=Z(e,{relative:t.relative});if(!r.isTransitioning)return!1;let i=F(r.currentLocation.pathname,n)||r.currentLocation.pathname,o=F(r.nextLocation.pathname,n)||r.nextLocation.pathname;return ve(a.pathname,o)!=null||ve(a.pathname,i)!=null}var ar=e=>typeof e=="function",X=(e,t)=>ar(e)?e(t):e,or=(()=>{let e=0;return()=>(++e).toString()})(),Ie=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ir=20,he="default",Be=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(o=>o.id===t.toast.id?{...o,...t.toast}:o)};case 2:let{toast:n}=t;return Be(e,{type:e.toasts.find(o=>o.id===n.id)?1:0,toast:n});case 3:let{toastId:a}=t;return{...e,toasts:e.toasts.map(o=>o.id===a||a===void 0?{...o,dismissed:!0,visible:!1}:o)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(o=>o.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(o=>({...o,pauseDuration:o.pauseDuration+i}))}}},H=[],$e={toasts:[],pausedAt:void 0,settings:{toastLimit:ir}},O={},Fe=(e,t=he)=>{O[t]=Be(O[t]||$e,e),H.forEach(([r,n])=>{r===t&&n(O[t])})},ze=e=>Object.keys(O).forEach(t=>Fe(e,t)),sr=e=>Object.keys(O).find(t=>O[t].toasts.some(r=>r.id===e)),ee=(e=he)=>t=>{Fe(t,e)},lr={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},ur=(e={},t=he)=>{let[r,n]=s.useState(O[t]||$e),a=s.useRef(O[t]);s.useEffect(()=>(a.current!==O[t]&&n(O[t]),H.push([t,n]),()=>{let o=H.findIndex(([f])=>f===t);o>-1&&H.splice(o,1)}),[t]);let i=r.toasts.map(o=>{var f,c,d;return{...e,...e[o.type],...o,removeDelay:o.removeDelay||((f=e[o.type])==null?void 0:f.removeDelay)||(e==null?void 0:e.removeDelay),duration:o.duration||((c=e[o.type])==null?void 0:c.duration)||(e==null?void 0:e.duration)||lr[o.type],style:{...e.style,...(d=e[o.type])==null?void 0:d.style,...o.style}}});return{...r,toasts:i}},cr=(e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(r==null?void 0:r.id)||or()}),V=e=>(t,r)=>{let n=cr(t,e,r);return ee(n.toasterId||sr(n.id))({type:2,toast:n}),n.id},P=(e,t)=>V("blank")(e,t);P.error=V("error");P.success=V("success");P.loading=V("loading");P.custom=V("custom");P.dismiss=(e,t)=>{let r={type:3,toastId:e};t?ee(t)(r):ze(r)};P.dismissAll=e=>P.dismiss(void 0,e);P.remove=(e,t)=>{let r={type:4,toastId:e};t?ee(t)(r):ze(r)};P.removeAll=e=>P.remove(void 0,e);P.promise=(e,t,r)=>{let n=P.loading(t.loading,{...r,...r==null?void 0:r.loading});return typeof e=="function"&&(e=e()),e.then(a=>{let i=t.success?X(t.success,a):void 0;return i?P.success(i,{id:n,...r,...r==null?void 0:r.success}):P.dismiss(n),a}).catch(a=>{let i=t.error?X(t.error,a):void 0;i?P.error(i,{id:n,...r,...r==null?void 0:r.error}):P.dismiss(n)}),e};var dr=1e3,fr=(e,t="default")=>{let{toasts:r,pausedAt:n}=ur(e,t),a=s.useRef(new Map).current,i=s.useCallback((u,p=dr)=>{if(a.has(u))return;let h=setTimeout(()=>{a.delete(u),o({type:4,toastId:u})},p);a.set(u,h)},[]);s.useEffect(()=>{if(n)return;let u=Date.now(),p=r.map(h=>{if(h.duration===1/0)return;let y=(h.duration||0)+h.pauseDuration-(u-h.createdAt);if(y<0){h.visible&&P.dismiss(h.id);return}return setTimeout(()=>P.dismiss(h.id,t),y)});return()=>{p.forEach(h=>h&&clearTimeout(h))}},[r,n,t]);let o=s.useCallback(ee(t),[t]),f=s.useCallback(()=>{o({type:5,time:Date.now()})},[o]),c=s.useCallback((u,p)=>{o({type:1,toast:{id:u,height:p}})},[o]),d=s.useCallback(()=>{n&&o({type:6,time:Date.now()})},[n,o]),l=s.useCallback((u,p)=>{let{reverseOrder:h=!1,gutter:y=8,defaultPosition:b}=p||{},g=r.filter(v=>(v.position||b)===(u.position||b)&&v.height),E=g.findIndex(v=>v.id===u.id),w=g.filter((v,m)=>m<E&&v.visible).length;return g.filter(v=>v.visible).slice(...h?[w+1]:[0,w]).reduce((v,m)=>v+(m.height||0)+y,0)},[r]);return s.useEffect(()=>{r.forEach(u=>{if(u.dismissed)i(u.id,u.removeDelay);else{let p=a.get(u.id);p&&(clearTimeout(p),a.delete(u.id))}})},[r,i]),{toasts:r,handlers:{updateHeight:c,startPause:f,endPause:d,calculateOffset:l}}},pr=N`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,hr=N`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,mr=N`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,vr=U("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${pr} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${hr} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${mr} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,yr=N`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,gr=U("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${yr} 1s linear infinite;
`,br=N`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,xr=N`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Cr=U("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${br} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${xr} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,wr=U("div")`
  position: absolute;
`,Er=U("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Rr=N`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Sr=U("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Rr} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Pr=({toast:e})=>{let{icon:t,type:r,iconTheme:n}=e;return t!==void 0?typeof t=="string"?s.createElement(Sr,null,t):t:r==="blank"?null:s.createElement(Er,null,s.createElement(gr,{...n}),r!=="loading"&&s.createElement(wr,null,r==="error"?s.createElement(vr,{...n}):s.createElement(Cr,{...n})))},Tr=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,kr=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Dr="0%{opacity:0;} 100%{opacity:1;}",Or="0%{opacity:1;} 100%{opacity:0;}",jr=U("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,Lr=U("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Nr=(e,t)=>{let r=e.includes("top")?1:-1,[n,a]=Ie()?[Dr,Or]:[Tr(r),kr(r)];return{animation:t?`${N(n)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${N(a)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Mr=s.memo(({toast:e,position:t,style:r,children:n})=>{let a=e.height?Nr(e.position||t||"top-center",e.visible):{opacity:0},i=s.createElement(Pr,{toast:e}),o=s.createElement(Lr,{...e.ariaProps},X(e.message,e));return s.createElement(jr,{className:e.className,style:{...a,...r,...e.style}},typeof n=="function"?n({icon:i,message:o}):s.createElement(s.Fragment,null,i,o))});et(s.createElement);var Ar=({id:e,className:t,style:r,onHeightUpdate:n,children:a})=>{let i=s.useCallback(o=>{if(o){let f=()=>{let c=o.getBoundingClientRect().height;n(e,c)};f(),new MutationObserver(f).observe(o,{subtree:!0,childList:!0,characterData:!0})}},[e,n]);return s.createElement("div",{ref:i,className:t,style:r},a)},Ur=(e,t)=>{let r=e.includes("top"),n=r?{top:0}:{bottom:0},a=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:Ie()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(r?1:-1)}px)`,...n,...a}},_r=Ze`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,W=16,Rn=({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:n,children:a,toasterId:i,containerStyle:o,containerClassName:f})=>{let{toasts:c,handlers:d}=fr(r,i);return s.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:W,left:W,right:W,bottom:W,pointerEvents:"none",...o},className:f,onMouseEnter:d.startPause,onMouseLeave:d.endPause},c.map(l=>{let u=l.position||t,p=d.calculateOffset(l,{reverseOrder:e,gutter:n,defaultPosition:t}),h=Ur(u,p);return s.createElement(Ar,{id:l.id,key:l.id,onHeightUpdate:d.updateHeight,className:l.visible?_r:"",style:h},l.type==="custom"?X(l.message,l):a?a(l):s.createElement(Mr,{toast:l,position:u}))}))},Sn=P,Ir=typeof window<"u"&&window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__:function(){if(arguments.length!==0)return typeof arguments[0]=="object"?ie:ie.apply(null,arguments)},Br=e=>e&&typeof e.match=="function";function $(e,t){function r(...n){if(t){let a=t(...n);if(!a)throw new Error(L(0));return{type:e,payload:a.payload,..."meta"in a&&{meta:a.meta},..."error"in a&&{error:a.error}}}return{type:e,payload:n[0]}}return r.toString=()=>`${e}`,r.type=e,r.match=n=>tt(n)&&n.type===e,r}var Ve=class B extends Array{constructor(...t){super(...t),Object.setPrototypeOf(this,B.prototype)}static get[Symbol.species](){return B}concat(...t){return super.concat.apply(this,t)}prepend(...t){return t.length===1&&Array.isArray(t[0])?new B(...t[0].concat(this)):new B(...t.concat(this))}};function Ce(e){return Te(e)?ke(e,()=>{}):e}function q(e,t,r){return e.has(t)?e.get(t):e.set(t,r(t)).get(t)}function $r(e){return typeof e=="boolean"}var Fr=()=>function(t){const{thunk:r=!0,immutableCheck:n=!0,serializableCheck:a=!0,actionCreatorCheck:i=!0}=t??{};let o=new Ve;return r&&($r(r)?o.push(st):o.push(lt(r.extraArgument))),o},zr="RTK_autoBatch",we=e=>t=>{setTimeout(t,e)},Vr=(e={type:"raf"})=>t=>(...r)=>{const n=t(...r);let a=!0,i=!1,o=!1;const f=new Set,c=e.type==="tick"?queueMicrotask:e.type==="raf"?typeof window<"u"&&window.requestAnimationFrame?window.requestAnimationFrame:we(10):e.type==="callback"?e.queueNotification:we(e.timeout),d=()=>{o=!1,i&&(i=!1,f.forEach(l=>l()))};return Object.assign({},n,{subscribe(l){const u=()=>a&&l(),p=n.subscribe(u);return f.add(l),()=>{p(),f.delete(l)}},dispatch(l){var u;try{return a=!((u=l==null?void 0:l.meta)!=null&&u[zr]),i=!a,i&&(o||(o=!0,c(d))),n.dispatch(l)}finally{a=!0}}})},Wr=e=>function(r){const{autoBatch:n=!0}=r??{};let a=new Ve(e);return n&&a.push(Vr(typeof n=="object"?n:void 0)),a};function Pn(e){const t=Fr(),{reducer:r=void 0,middleware:n,devTools:a=!0,preloadedState:i=void 0,enhancers:o=void 0}=e||{};let f;if(typeof r=="function")f=r;else if(nt(r))f=at(r);else throw new Error(L(1));let c;typeof n=="function"?c=n(t):c=t();let d=ie;a&&(d=Ir({trace:!1,...typeof a=="object"&&a}));const l=ot(...c),u=Wr(l);let p=typeof o=="function"?o(u):u();const h=d(...p);return it(f,i,h)}function We(e){const t={},r=[];let n;const a={addCase(i,o){const f=typeof i=="string"?i:i.type;if(!f)throw new Error(L(28));if(f in t)throw new Error(L(29));return t[f]=o,a},addAsyncThunk(i,o){return o.pending&&(t[i.pending.type]=o.pending),o.rejected&&(t[i.rejected.type]=o.rejected),o.fulfilled&&(t[i.fulfilled.type]=o.fulfilled),o.settled&&r.push({matcher:i.settled,reducer:o.settled}),a},addMatcher(i,o){return r.push({matcher:i,reducer:o}),a},addDefaultCase(i){return n=i,a}};return e(a),[t,r,n]}function qr(e){return typeof e=="function"}function Jr(e,t){let[r,n,a]=We(t),i;if(qr(e))i=()=>Ce(e());else{const f=Ce(e);i=()=>f}function o(f=i(),c){let d=[r[c.type],...n.filter(({matcher:l})=>l(c)).map(({reducer:l})=>l)];return d.filter(l=>!!l).length===0&&(d=[a]),d.reduce((l,u)=>{if(u)if(rt(l)){const h=u(l,c);return h===void 0?l:h}else{if(Te(l))return ke(l,p=>u(p,c));{const p=u(l,c);if(p===void 0){if(l===null)return l;throw Error("A case reducer on a non-draftable value must not return undefined")}return p}}return l},f)}return o.getInitialState=i,o}var Hr=(e,t)=>Br(e)?e.match(t):e(t);function Kr(...e){return t=>e.some(r=>Hr(r,t))}var Gr="ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW",Xr=(e=21)=>{let t="",r=e;for(;r--;)t+=Gr[Math.random()*64|0];return t},Qr=["name","message","stack","code"],oe=class{constructor(e,t){re(this,"_type");this.payload=e,this.meta=t}},Ee=class{constructor(e,t){re(this,"_type");this.payload=e,this.meta=t}},Yr=e=>{if(typeof e=="object"&&e!==null){const t={};for(const r of Qr)typeof e[r]=="string"&&(t[r]=e[r]);return t}return{message:String(e)}},Re="External signal was aborted",Tn=(()=>{function e(t,r,n){const a=$(t+"/fulfilled",(c,d,l,u)=>({payload:c,meta:{...u||{},arg:l,requestId:d,requestStatus:"fulfilled"}})),i=$(t+"/pending",(c,d,l)=>({payload:void 0,meta:{...l||{},arg:d,requestId:c,requestStatus:"pending"}})),o=$(t+"/rejected",(c,d,l,u,p)=>({payload:u,error:(n&&n.serializeError||Yr)(c||"Rejected"),meta:{...p||{},arg:l,requestId:d,rejectedWithValue:!!u,requestStatus:"rejected",aborted:(c==null?void 0:c.name)==="AbortError",condition:(c==null?void 0:c.name)==="ConditionError"}}));function f(c,{signal:d}={}){return(l,u,p)=>{const h=n!=null&&n.idGenerator?n.idGenerator(c):Xr(),y=new AbortController;let b,g;function E(v){g=v,y.abort()}d&&(d.aborted?E(Re):d.addEventListener("abort",()=>E(Re),{once:!0}));const w=async function(){var x,R;let v;try{let S=(x=n==null?void 0:n.condition)==null?void 0:x.call(n,c,{getState:u,extra:p});if(en(S)&&(S=await S),S===!1||y.signal.aborted)throw{name:"ConditionError",message:"Aborted due to condition callback returning false."};const k=new Promise((C,D)=>{b=()=>{D({name:"AbortError",message:g||"Aborted"})},y.signal.addEventListener("abort",b,{once:!0})});l(i(h,c,(R=n==null?void 0:n.getPendingMeta)==null?void 0:R.call(n,{requestId:h,arg:c},{getState:u,extra:p}))),v=await Promise.race([k,Promise.resolve(r(c,{dispatch:l,getState:u,extra:p,requestId:h,signal:y.signal,abort:E,rejectWithValue:(C,D)=>new oe(C,D),fulfillWithValue:(C,D)=>new Ee(C,D)})).then(C=>{if(C instanceof oe)throw C;return C instanceof Ee?a(C.payload,h,c,C.meta):a(C,h,c)})])}catch(S){v=S instanceof oe?o(null,h,c,S.payload,S.meta):o(S,h,c)}finally{b&&y.signal.removeEventListener("abort",b)}return n&&!n.dispatchConditionRejection&&o.match(v)&&v.meta.condition||l(v),v}();return Object.assign(w,{abort:E,requestId:h,arg:c,unwrap(){return w.then(Zr)}})}}return Object.assign(f,{pending:i,rejected:o,fulfilled:a,settled:Kr(o,a),typePrefix:t})}return e.withTypes=()=>e,e})();function Zr(e){if(e.meta&&e.meta.rejectedWithValue)throw e.payload;if(e.error)throw e.error;return e.payload}function en(e){return e!==null&&typeof e=="object"&&typeof e.then=="function"}var tn=Symbol.for("rtk-slice-createasyncthunk");function rn(e,t){return`${e}/${t}`}function nn({creators:e}={}){var r;const t=(r=e==null?void 0:e.asyncThunk)==null?void 0:r[tn];return function(a){const{name:i,reducerPath:o=i}=a;if(!i)throw new Error(L(11));const f=(typeof a.reducers=="function"?a.reducers(on()):a.reducers)||{},c=Object.keys(f),d={sliceCaseReducersByName:{},sliceCaseReducersByType:{},actionCreators:{},sliceMatchers:[]},l={addCase(m,x){const R=typeof m=="string"?m:m.type;if(!R)throw new Error(L(12));if(R in d.sliceCaseReducersByType)throw new Error(L(13));return d.sliceCaseReducersByType[R]=x,l},addMatcher(m,x){return d.sliceMatchers.push({matcher:m,reducer:x}),l},exposeAction(m,x){return d.actionCreators[m]=x,l},exposeCaseReducer(m,x){return d.sliceCaseReducersByName[m]=x,l}};c.forEach(m=>{const x=f[m],R={reducerName:m,type:rn(i,m),createNotation:typeof a.reducers=="function"};ln(x)?cn(R,x,l,t):sn(R,x,l)});function u(){const[m={},x=[],R=void 0]=typeof a.extraReducers=="function"?We(a.extraReducers):[a.extraReducers],S={...m,...d.sliceCaseReducersByType};return Jr(a.initialState,k=>{for(let C in S)k.addCase(C,S[C]);for(let C of d.sliceMatchers)k.addMatcher(C.matcher,C.reducer);for(let C of x)k.addMatcher(C.matcher,C.reducer);R&&k.addDefaultCase(R)})}const p=m=>m,h=new Map,y=new WeakMap;let b;function g(m,x){return b||(b=u()),b(m,x)}function E(){return b||(b=u()),b.getInitialState()}function w(m,x=!1){function R(k){let C=k[m];return typeof C>"u"&&x&&(C=q(y,R,E)),C}function S(k=p){const C=q(h,x,()=>new WeakMap);return q(C,k,()=>{const D={};for(const[te,qe]of Object.entries(a.selectors??{}))D[te]=an(qe,k,()=>q(y,k,E),x);return D})}return{reducerPath:m,getSelectors:S,get selectors(){return S(R)},selectSlice:R}}const v={name:i,reducer:g,actions:d.actionCreators,caseReducers:d.sliceCaseReducersByName,getInitialState:E,...w(o),injectInto(m,{reducerPath:x,...R}={}){const S=x??o;return m.inject({reducerPath:S,reducer:g},R),{...v,...w(S,!0)}}};return v}}function an(e,t,r,n){function a(i,...o){let f=t(i);return typeof f>"u"&&n&&(f=r()),e(f,...o)}return a.unwrapped=e,a}var kn=nn();function on(){function e(t,r){return{_reducerDefinitionType:"asyncThunk",payloadCreator:t,...r}}return e.withTypes=()=>e,{reducer(t){return Object.assign({[t.name](...r){return t(...r)}}[t.name],{_reducerDefinitionType:"reducer"})},preparedReducer(t,r){return{_reducerDefinitionType:"reducerWithPrepare",prepare:t,reducer:r}},asyncThunk:e}}function sn({type:e,reducerName:t,createNotation:r},n,a){let i,o;if("reducer"in n){if(r&&!un(n))throw new Error(L(17));i=n.reducer,o=n.prepare}else i=n;a.addCase(e,i).exposeCaseReducer(t,i).exposeAction(t,o?$(e,o):$(e))}function ln(e){return e._reducerDefinitionType==="asyncThunk"}function un(e){return e._reducerDefinitionType==="reducerWithPrepare"}function cn({type:e,reducerName:t},r,n,a){if(!a)throw new Error(L(18));const{payloadCreator:i,fulfilled:o,pending:f,rejected:c,settled:d,options:l}=r,u=a(e,i,l);n.exposeAction(t,u),o&&n.addCase(u.fulfilled,o),f&&n.addCase(u.pending,f),c&&n.addCase(u.rejected,c),d&&n.addMatcher(u.settled,d),n.exposeCaseReducer(t,{fulfilled:o||J,pending:f||J,rejected:c||J,settled:d||J})}function J(){}function L(e){return`Minified Redux Toolkit error #${e}; visit https://redux-toolkit.js.org/Errors?code=${e} for the full message or use the non-minified dev environment for full errors. `}export{Cn as B,Rn as F,er as L,wn as N,bn as O,hn as P,xn as R,kn as a,mn as b,Tn as c,pe as d,_ as e,zt as f,gn as g,Pn as h,yn as i,En as j,vn as u,Sn as z};
