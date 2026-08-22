import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrgNode } from '../../core/models';

@Component({
  selector: 'app-org-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './org-tree.html',
  styleUrl: './org-tree.css'
})
export class OrgTree {
  @Input() nodes: OrgNode[] = [];
}