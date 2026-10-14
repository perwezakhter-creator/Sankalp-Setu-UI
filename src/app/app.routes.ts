import { Routes } from '@angular/router';

import { HomeLayout } from './layout/home-layout/home-layout';
import { Home } from './components/home/home';
import { Orgstructure } from './components/orgstructure/orgstructure';
import { About } from './components/about/about';
import { Gallery } from './components/gallery/gallery';
import { BeneficiaryComponent } from './components/beneficiary/beneficiary-dashboard';

import { Login } from './components/login/login';

import { MasterLayout } from './layout/master-layout/master-layout';
import { Dashboard } from './components/dashboard/dashboard';
import { DistrictComponent } from './components/district/district';
import { BlockComponent } from './components/block/block';
import { GalleryAdmin } from './components/gallery-admin/gallery-admin';
import { BroadcastComponent } from './components/broadcast/broadcast';
import { InterestMessageComponent } from './components/interest-message/interest-message';
import { SendBroadcastComponent } from './components/send-broadcast/send-broadcast';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [

  // ============================================
  // PUBLIC WEBSITE
  // ============================================

  {
    path: '',
    component: HomeLayout,

    children: [

      {
        path: '',
        component: Home
      },

      {
        path: 'orgstructure',
        component: Orgstructure
      },

      {
        path: 'about',
        component: About
      },

       {
        path: 'gallery',
        component: Gallery
      },

      {
        path: 'login',
        component: Login
      },

    ]
  },

  {
    path: 'beneficiary-dashboard',
    component: BeneficiaryComponent
  },


  // ============================================
  // LOGIN
  // ============================================

  


  // ============================================
  // ADMIN / AFTER LOGIN
  // ============================================

  {
    path: '',
    component: MasterLayout,
    canActivate: [authGuard],

    children: [

      {
        path: 'dashboard',
        component: Dashboard
      },

      {
        path: 'district',
        component: DistrictComponent
      },

      {
        path: 'block',
        component: BlockComponent
      },

      {
        path: 'gallery-admin',
        component: GalleryAdmin
      },

      {
        path: 'broadcast',
        component: BroadcastComponent
      },

      {
        path: 'send-broadcast',
        component: SendBroadcastComponent
      },

      {
        path: 'interest-message',
        component: InterestMessageComponent
      }

    ]
  },


  // ============================================
  // UNKNOWN URL
  // ============================================

  {
    path: '**',
    redirectTo: ''
  }

];
