
      // Auto-generated index file for Medusa Admin UI extensions
    import WidgetComponent0, { config as WidgetConfig0 } from "/app/src/admin/widgets/order-subscription-summary.tsx"

const widgetModule = { widgets: [
  {
    Component: WidgetComponent0,
    zone: ["order.details.side.after"]
}
] }
    import RouteComponent0, { handle as handle0 } from "/app/src/admin/routes/subscriptions/page.tsx"
import RouteComponent1, { handle as handle1 } from "/app/src/admin/routes/subscriptions/cancellations/page.tsx"
import RouteComponent2, { handle as handle2 } from "/app/src/admin/routes/subscriptions/analytics/page.tsx"
import RouteComponent3, { handle as handle3 } from "/app/src/admin/routes/subscriptions/activity-log/page.tsx"
import RouteComponent4, { handle as handle4, loader as loader4 } from "/app/src/admin/routes/subscriptions/[id]/page.tsx"
import RouteComponent5, { handle as handle5 } from "/app/src/admin/routes/subscriptions/dunning/page.tsx"
import RouteComponent6, { handle as handle6 } from "/app/src/admin/routes/subscriptions/renewals/page.tsx"
import RouteComponent7, { handle as handle7 } from "/app/src/admin/routes/subscriptions/plans-offers/page.tsx"
import RouteComponent8 from "/app/src/admin/routes/settings/subscription-settings/page.tsx"
import RouteComponent9, { handle as handle9 } from "/app/src/admin/routes/subscriptions/dunning/[id]/page.tsx"
import RouteComponent10, { handle as handle10 } from "/app/src/admin/routes/subscriptions/cancellations/[id]/page.tsx"
import RouteComponent11, { handle as handle11 } from "/app/src/admin/routes/subscriptions/renewals/[id]/page.tsx"

const routeModule = { routes: [
    {
    Component: RouteComponent0,
    path: "/subscriptions",
    handle: handle0
  },
{
    Component: RouteComponent1,
    path: "/subscriptions/cancellations",
    handle: handle1
  },
{
    Component: RouteComponent2,
    path: "/subscriptions/analytics",
    handle: handle2
  },
{
    Component: RouteComponent3,
    path: "/subscriptions/activity-log",
    handle: handle3
  },
{
    Component: RouteComponent4,
    path: "/subscriptions/:id",
    handle: handle4,
    loader: loader4
  },
{
    Component: RouteComponent5,
    path: "/subscriptions/dunning",
    handle: handle5
  },
{
    Component: RouteComponent6,
    path: "/subscriptions/renewals",
    handle: handle6
  },
{
    Component: RouteComponent7,
    path: "/subscriptions/plans-offers",
    handle: handle7
  },
{
    Component: RouteComponent8,
    path: "/settings/subscription-settings"
  },
{
    Component: RouteComponent9,
    path: "/subscriptions/dunning/:id",
    handle: handle9
  },
{
    Component: RouteComponent10,
    path: "/subscriptions/cancellations/:id",
    handle: handle10
  },
{
    Component: RouteComponent11,
    path: "/subscriptions/renewals/:id",
    handle: handle11
  }
]
 }
    import { config as RouteConfig0 } from "/app/src/admin/routes/subscriptions/page.tsx"
import { config as RouteConfig1 } from "/app/src/admin/routes/subscriptions/cancellations/page.tsx"
import { config as RouteConfig2 } from "/app/src/admin/routes/subscriptions/analytics/page.tsx"
import { config as RouteConfig4 } from "/app/src/admin/routes/subscriptions/activity-log/page.tsx"
import { config as RouteConfig5 } from "/app/src/admin/routes/subscriptions/dunning/page.tsx"
import { config as RouteConfig6 } from "/app/src/admin/routes/subscriptions/plans-offers/page.tsx"
import { config as RouteConfig7 } from "/app/src/admin/routes/subscriptions/renewals/page.tsx"
import { config as RouteConfig8 } from "/app/src/admin/routes/settings/subscription-settings/page.tsx"

const menuItemModule = { menuItems: [
    {
    label: RouteConfig0.label,
    icon: RouteConfig0.icon,
    path: "/subscriptions",
    nested: undefined,
    rank: undefined,
    translationNs: undefined
  },
{
    label: RouteConfig1.label,
    icon: undefined,
    path: "/subscriptions/cancellations",
    nested: undefined,
    rank: 4,
    translationNs: undefined
  },
{
    label: RouteConfig2.label,
    icon: undefined,
    path: "/subscriptions/analytics",
    nested: undefined,
    rank: 5,
    translationNs: undefined
  },
{
    label: RouteConfig4.label,
    icon: undefined,
    path: "/subscriptions/activity-log",
    nested: undefined,
    rank: undefined,
    translationNs: undefined
  },
{
    label: RouteConfig5.label,
    icon: undefined,
    path: "/subscriptions/dunning",
    nested: undefined,
    rank: 3,
    translationNs: undefined
  },
{
    label: RouteConfig6.label,
    icon: undefined,
    path: "/subscriptions/plans-offers",
    nested: undefined,
    rank: 1,
    translationNs: undefined
  },
{
    label: RouteConfig7.label,
    icon: undefined,
    path: "/subscriptions/renewals",
    nested: undefined,
    rank: 2,
    translationNs: undefined
  },
{
    label: RouteConfig8.label,
    icon: undefined,
    path: "/settings/subscription-settings",
    nested: undefined,
    rank: undefined,
    translationNs: undefined
  }
]
 }
    

const formModule = { customFields: {
  
} }
    

const displayModule = { 
    displays: {
      
    }
   }
    import { deepMerge } from "@medusajs/admin-shared"
import i18nTranslations0 from "/app/src/admin/i18n/index.ts"

const i18nModule = { resources: i18nTranslations0 }
    
    const plugin = {
      widgetModule,
      routeModule,
      menuItemModule,
      formModule,
      displayModule,
      i18nModule
    }

    export default plugin
    