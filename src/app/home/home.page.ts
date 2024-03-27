import { Component, OnDestroy } from '@angular/core';
import { TrashCategories } from '../enums/trash-categories';
import { take } from 'rxjs/operators';

import { ArduinoDataService, ClassificationResult } from '../services/arduino-data.service';
import { Subscription } from 'rxjs';


interface CategoryCount {
  [category: string]: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage implements OnDestroy{
  private dataSubscription: Subscription | undefined;
  private categoryCounts: CategoryCount = {};
  private results: ClassificationResult[] = [];
  private predictions: { category: string, value: number }[] = [];
  
  classificationPropability: number = 0.0;
  classificationResults: ClassificationResult = {};
  classifiedTrashCategory: string = '';
  classifiedCategory: string = '';
  buttonPressed: boolean = false;
  isLoading: boolean = false;
  isFinished: boolean = false;

  constructor(private arduinoDataService: ArduinoDataService) {}

  ngOnInit() {
    this.classifiedTrashCategory = '';
    this.classifiedCategory = '';
  }

  private readData() {
    console.log('Reading data');
    this.results = [];
    this.dataSubscription = this.arduinoDataService.getDataStream()
      .pipe(take(3))
      .subscribe(
        (data: ClassificationResult) => {
          console.log('Received data');
          this.results.push(data);

          if (this.results.length === 3) {
            this.determineMostFrequentCategory();
          }
        },
        error => {
          console.error('Error receiving data:', error);
        }
      );
  }

  private determineMostFrequentCategory() {
    this.categoryCounts = {};

    for (const result of this.results) {
      let highestValue = 0;
      let highestKey = '';

      for (const [key, value] of Object.entries(result)) {
        console.log(`${key}: ${value}`);
        if (value > highestValue) {
          highestValue = value;
          highestKey = key;
        }
        this.predictions.push({ category: key, value: value });
      }

      if (highestKey) {
        if (!this.categoryCounts[highestKey]) {
          this.categoryCounts[highestKey] = 1;
        } else {
          this.categoryCounts[highestKey]++;
        }
        console.log(`Highest key: ${highestKey}`);
      }
      console.log(`Category counts: ${JSON.stringify(this.categoryCounts)}`);
    }

    let finalCategory = '';
    let maxCount = 0;

    for (const [key, count] of Object.entries(this.categoryCounts)) {
      if (count > maxCount) {
        finalCategory = key;
        maxCount = count;
      }
    }

    console.log(`Most frequent category: ${finalCategory}`);
    this.classifiedCategory = finalCategory;
    
    this.classificationPropability = 0.0;
    for (const prediction of this.predictions) {
      if (prediction.category === finalCategory) {
        this.classificationPropability += prediction.value;
      }
    }
    this.classificationPropability /= 3;
    // rundet die Wahrscheinlichkeit auf 2 Nachkommastellen und multipliziert sie mit 100
    this.classificationPropability = Math.round(this.classificationPropability * 10000) / 100;
    

    for (const [key, value] of Object.entries(TrashCategories)) {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subKey === finalCategory) {
          this.classifiedCategory = subValue;
          if (key === 'trash') {
            this.classifiedTrashCategory = 'Restmüll';
          } else if (key === 'plastic') {
            this.classifiedTrashCategory = 'Wertstoffmüll';
          } else {
            this.classifiedTrashCategory = 'Papiermüll';
          }
          console.log(`Classified trash category: ${this.classifiedTrashCategory}`);
        }
      }
      this.isLoading = false;
    }

    // setze einen timer von 7 sekunden, danach kann der button wieder gedrückt werden
    setTimeout(() => {
      this.buttonPressed = false;
      this.isFinished = true;
      setTimeout(() => {
        this.isFinished = false;
      }, 2500);
    }, 7000);
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
  }

  onButtonPressed() {
    this.buttonPressed = true;
    this.predictions = [];
    this.classifiedTrashCategory = '';
    this.classifiedCategory = '';
    this.classificationResults = {};
    this.isLoading = true;
    this.readData();
  }

  getTrashColor(category: string): string {
    if (category === 'Wertstoffmüll') {
      return '#ECC753';
    } else if (category === 'Papiermüll') {
      return 'blue';
    } else {
      return '#141814';
    }
  }

  getCategoryAdvice(): string {
    if (TrashCategories['plastic']['yoghurt'] === this.classifiedCategory) {
      console.log('Yoghurt advice');
      return 'Hinweis: Bitte entferne den Alu-Deckel, sonst kann der Becher nicht recycled werden. Entsorge Papierbanderolen bitte separat im Papiermüll.';
    } else if (TrashCategories['trash']['ballpen'] === this.classifiedCategory) {
      console.log('Ballpen advice');
      return 'Hinweis: Zerlege den Kugelschreiber in seine Einzelteile bevor du ihn entsorgst.';
    } else {
      console.log('No advice');
      return '';
    }
  }
}