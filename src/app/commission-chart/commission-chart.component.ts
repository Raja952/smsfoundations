import { Component } from '@angular/core';

@Component({
  selector: 'app-commission-chart',
  templateUrl: './commission-chart.component.html',
  styleUrls: ['./commission-chart.component.scss']
})
export class CommissionChartComponent {

  commissionData = [
  {
    srNo: 1, commission: '20%', rank: 'Rural Associate',
    teamStructure: 500, target50: 250,
    monthlyBusiness: 125000, target60: 75000, team40: 50000
  },
  {
    srNo: 2, commission: '3%', rank: 'Block Associate',
    teamStructure: 1000, target50: 500,
    monthlyBusiness: 250000, target60: 150000, team40: 100000
  },
  {
    srNo: 3, commission: '2%', rank: 'Sub-Regional Associate',
    teamStructure: 1500, target50: 750,
    monthlyBusiness: 375000, target60: 225000, team40: 150000
  },
  {
    srNo: 4, commission: '1%', rank: 'Regional Associate',
    teamStructure: 2000, target50: 1000,
    monthlyBusiness: 500000, target60: 300000, team40: 200000
  },
  {
    srNo: 5, commission: '1%', rank: 'Sub-Divisional Associate',
    teamStructure: 2500, target50: 1250,
    monthlyBusiness: 625000, target60: 375000, team40: 250000
  },
  {
    srNo: 6, commission: '0.75%', rank: 'Divisional Associate',
    teamStructure: 3000, target50: 1500,
    monthlyBusiness: 750000, target60: 450000, team40: 300000
  },
  {
    srNo: 7, commission: '0.75%', rank: 'Zonal Associate',
    teamStructure: 3500, target50: 1750,
    monthlyBusiness: 875000, target60: 525000, team40: 350000
  },
  {
    srNo: 8, commission: '0.50%', rank: 'Management Associate',
    teamStructure: 4000, target50: 2000,
    monthlyBusiness: 1000000, target60: 600000, team40: 400000
  },
  {
    srNo: 9, commission: '0.50%', rank: 'D.D Associate',
    teamStructure: 4500, target50: 2250,
    monthlyBusiness: 1125000, target60: 675000, team40: 450000
  },
  {
    srNo: 10, commission: '0.50%', rank: 'Director Club Associate',
    teamStructure: 5000, target50: 2500,
    monthlyBusiness: 1250000, target60: 750000, team40: 500000
  }
];
}
