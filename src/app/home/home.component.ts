import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  features = [
    {
      icon: 'fa fa-bolt',
      title: 'Anion Technology',
      description: 'Negative Ion Technology for Health Benefits'
    },
    {
      icon: 'fa fa-heart',
      title: 'Ultra Soft',
      description: 'Ultra Soft & Hypoallergenic Cotton Surface'
    },
    {
      icon: 'fa fa-shield',
      title: 'Antibacterial',
      description: 'Antibacterial & Odor Control Properties'
    },
    {
      icon: 'fa fa-tint',
      title: 'Super Absorbent',
      description: 'Super Absorbent Core with Leak Protection'
    },
    {
      icon: 'fa fa-lock',
      title: 'Secure Fit',
      description: 'Wings for Secure Fit & Comfort'
    },
    {
      icon: 'fa fa-check-circle',
      title: 'Dermatologically Tested',
      description: 'Dermatologically Tested & Skin-Friendly'
    }
  ];

  stats = [
    { icon: 'fa fa-users', value: '10,000+', label: 'SMS PAD product' , img:'assets/Images/SMS.jpeg'},
    { icon: 'fa fa-product-hunt', value: '50,000+', label: 'ISO certificate', img:'assets/Images/ISOImage.jpg' }
  ];

  constructor() { }

  ngOnInit(): void {
    // Initialize any data or animations
  }
}
