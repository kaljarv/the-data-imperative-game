import { Injectable } from '@angular/core';

import * as d3 from 'd3';

/*
 * A basic wrapper around d3.js
 * To access the d3 namespace, use D3Service.d3
 */
@Injectable({
  providedIn: 'root'
})
export class D3Service {
  public d3: any = d3;

  constructor(
  ) {
  }
}
