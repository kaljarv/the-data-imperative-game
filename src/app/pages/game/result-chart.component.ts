import { Component, 
         ElementRef,
         Inject,
         Input,
         LOCALE_ID,
         OnDestroy,
         OnInit,
         ViewEncapsulation } from '@angular/core';

import { D3Service } from '../../shared';

export const BALANCE_CLASS = "balance";
export const RETURNS_CLASS = "returns";
export const TOOLTIP_CLASS = "tooltip";
export const WRAPPER_CLASS = "resultChart";

/*
 * For the chartData input
 */
export interface ResultChartData extends Array<any> {
  [index: number]: {
    balance: number,
    returns: number,
    round: number,
    investment: string
  }
}

/*
 * Create a d3 chart showing rounds, investments, returns and balance
 * Note that all strings passed as inputs should be already localized
 */
@Component({
  selector: 'app-result-chart',
  template: `<div class="${WRAPPER_CLASS}"></div>`,
  styleUrls: ['./result-chart.component.sass'],
  host: {
    '(window:resize)': 'updateChart($event)',
  },
  encapsulation: ViewEncapsulation.None
})
export class ResultChartComponent implements OnDestroy, OnInit {
  @Input() balanceLabel: string = "Balance";
  @Input('chartData') data: ResultChartData;
  @Input() returnsLabel: string = "Returns";
  @Input() roundLabel: string = "Month";
  @Input() showInvestment: boolean = true;

  public d3: any;

  constructor(
    private d3Service: D3Service,
    private hostElement: ElementRef,
    @Inject(LOCALE_ID) public locale: string
  ) {
    this.d3 = d3Service.d3;
  }

  public ngOnInit(): void {
    this.createChart();
  }

  public ngOnDestroy(): void {
  }

  public createChart(): void {
    // Based on:
    // https://observablehq.com/@d3/line-chart
    // https://observablehq.com/@d3/line-chart-with-tooltip
    // https://observablehq.com/@d3/bar-chart

    // Options
    const margin = {top: 20, right: 50, bottom: 20, left: 50};
    // Horizontal padding between the returns plot and y axes
    const innerPadding = 20; 
    // Max height for the x axis labels
    const bottomAxisTextMaxHeight = 80;
    // Fraction of max returns to extend the range so that max balance is always positioned higher than max returns
    const returnsDomainTopPadding = 0.1;
    // Padding around balance bars as a fraction of the bar width 
    const barPadding = 0.5;
    // Max pixel width of bars
    const barMaxWidth = 20;
    // Currency code
    const currency = "USD";

    // Shortcuts
    const d3 = this.d3;
    const data = this.data;
    const wrapper = d3.select(this.hostElement.nativeElement).select('.' + WRAPPER_CLASS);

    // Calculate dimensions
    const height = wrapper.node().offsetHeight;
    const width =  wrapper.node().offsetWidth;
    const textLength = Math.min(height * 0.25, this.showInvestment ? bottomAxisTextMaxHeight : 0);
          margin.bottom += textLength;
    const xDomain = d3.extent(data.map(d => d.round));
    const xRange  = [margin.left + innerPadding, width - margin.right - innerPadding];
    const yRange  = [height - margin.bottom, margin.top];
    const barWidth = Math.min((xRange[1] - xRange[0]) / (data.length - 1) * (1 - barPadding), barMaxWidth);

    // Calculate a uniform domain for both values so that returns 1/10 of balances
    const yMax = Math.max(d3.max(data, d => d.returns) * (1 + returnsDomainTopPadding), d3.max(data, d => d.balance) / 10);

    // Formatting for currencies
    const formatCurrency = value => {
      return value.toLocaleString(this.locale, {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
      });
    }

    // X and y scaling

    // Returns
    const x = d3.scaleLinear()
      .domain(xDomain)
      .range(xRange);
    const y = d3.scaleLinear()
      .domain([0, yMax]).nice()
      .range(yRange);

    // Balance
    const y2 = d3.scaleLinear()
      .domain([0, yMax * 10]).nice()
      .range(yRange);

    // Axes
    // Returns y
    const yAxis = g => g
      .attr("transform", `translate(${margin.left},0)`)
      .attr("class", RETURNS_CLASS)
      .call(d3.axisLeft(y))
      .call(g => g.select(".domain").remove())
      .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(this.returnsLabel)
      );
    // Balance y
    const yAxis2 = g => g
      .attr("transform", `translate(${width - margin.right},0)`)
      .attr("class", BALANCE_CLASS)
      .call(d3.axisRight(y2))
      .call(g => g.select(".domain").remove())
      .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", -3)
        .attr("text-anchor", "end")
        .attr("font-weight", "bold")
        .text(this.balanceLabel)
      );

    const xAxis = g => {
      g.attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(data.length))
        // Remove default domain line and make a new one that's a bit extended past the extreme ticks
        // The width includes 6px to cover the yAxes' ticks, y coord 0.5 centers the line
        .call(g => g.select(".domain").remove())
        .call(g => g.append("path")
          .attr("d", d3.line()([[margin.left - 6, 0.5], [width - margin.right + 6, 0.5]]))
          .attr("stroke", "currentColor")
          .attr("class", "domain")
        );
      if (this.showInvestment) {
        g.selectAll("text")    
          .attr("text-anchor", "end")
          .attr("dx", "-1em")
          .attr("dy", "0.2em")
          .attr("transform", "rotate(-45)")
          // .attr("lengthAdjust", "spacingAndGlyphs")
          // .attr("textLength", textLength)
          .text((d, i) => this.data[i].investment);
      }
      return g;
    };

    // Returns
    const line = d3.line()
      .defined(d => !isNaN(d.returns))
      .x(d => x(d.round))
      .y(d => y(d.returns));

    // Tooltip function
    const callout = (g, round, investment, returns, balance) => {
      if (round == null) return g.style("display", "none");
    
      const labels = [
        this.roundLabel,
        null,
        this.returnsLabel,
        this.balanceLabel,
      ];
      g.style("display", null)
        .style("pointer-events", "none")
        .style("font-size", "10px");
      const path = g.selectAll("path")
        .data([null])
        .join("path")
          .attr("fill", "white")
          .attr("stroke", "black");
      const text = g.selectAll("text")
        .data([null])
        .join("text")
        .call(text => text
          .selectAll("tspan")
          .data([round, investment, returns, balance])
          .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i) => `${i * 1.1}em`)
            .style("font-weight", (_, i) => i === 1 ? "bold" : null)
            .text((d, i) => labels[i] ? `${labels[i]}: ${d}` : d)
          );
      const {x, y, width: w, height: h} = text.node().getBBox();
      text.attr("transform", `translate(${-w / 2},${15 - y})`);
      path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
    }

    // Bisect function for the tooltip
    const _bisect = d3.bisector(d => d.round).left;
    const bisect = (mx: number) => {
      const round = x.invert(mx);
      const index = _bisect(data, round, 1);
      const a = data[index - 1];
      const b = data[index];
      return b && (round - a.round > b.round - round) ? b : a;
    };
    
    // Render chart

    // Clear possible existing one
    wrapper.selectAll('svg').remove();
    // Create new svg element
    const svg = wrapper.append('svg');

    svg.attr("viewBox", [0, 0, width, height]);
    svg.append("g")
      .call(xAxis);
    svg.append("g")
      .call(yAxis);
    svg.append("g")
      .call(yAxis2);
    // Balance
    svg.append("g")
      .attr("fill", "yellow")
      .attr("class", BALANCE_CLASS)
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.round) - barWidth / 2)
      .attr("y", d => y2(d.balance))
      .attr("height", d => y2(0) - y2(d.balance))
      .attr("width", barWidth);
    // Returns
    svg.append("g")
      .attr("class", RETURNS_CLASS)
      .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 4)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);
    
    // Add tooltip
    const tooltip = svg.append("g")
      .attr("class", TOOLTIP_CLASS);
    svg.on("touchmove mousemove", function(event) {
      const datum = bisect(d3.pointer(event, this)[0]);
      tooltip.attr("transform", `translate(${x(datum.round)},${y(datum.returns)})`)
        .call(callout, datum.round, datum.investment, formatCurrency(datum.returns), formatCurrency(datum.balance));
    });
    svg.on("touchend mouseleave", () => tooltip.call(callout, null));
  }

  public updateChart(event: Event): void {
    this.createChart();
  }
}