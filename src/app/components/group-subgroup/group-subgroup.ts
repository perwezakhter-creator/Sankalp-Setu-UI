import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import {
  CreateGroupRequest,
  CreateSubGroupRequest,
  Group,
  SubGroup
} from '../../models/group-subgroup';

type ModalType = 'group' | 'subgroup' | null;

@Component({
  selector: 'app-group-subgroup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './group-subgroup.html',
  styleUrl: './group-subgroup.css'
})
export class GroupSubgroupComponent implements OnInit {
  private readonly groupService = inject(GroupService);
  private readonly cdr = inject(ChangeDetectorRef);

  groups: Group[] = [];
  subGroups: SubGroup[] = [];
  loading = true;
  groupSaving = false;
  subGroupSaving = false;
  activeModal: ModalType = null;
  successMessage = '';
  errorMessage = '';

  readonly groupForm = new FormGroup({
    portal_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    }),
    portal_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000), Validators.pattern(/^$|^[a-z][a-z\d+.-]*:\/\/.+/i)]
    }),
    portal_image_path: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)]
    }),
    is_active: new FormControl<'Y' | 'N'>('Y', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  readonly subGroupForm = new FormGroup({
    portal_id: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    user_type_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    }),
    user_type_name_hn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)]
    }),
    is_active: new FormControl<'Y' | 'N'>('Y', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  ngOnInit(): void {
    this.loadGroupManagement();
  }

  get activeGroupCount(): number {
    return this.groups.filter(group => group.is_active === 'Y').length;
  }

  get activeSubGroupCount(): number {
    return this.subGroups.filter(subGroup => subGroup.is_active === 'Y').length;
  }

  openModal(type: Exclude<ModalType, null>): void {
    this.errorMessage = '';
    this.activeModal = type;

    if (type === 'group') {
      this.resetGroupForm();
    } else {
      this.resetSubGroupForm();
    }
  }

  closeModal(): void {
    if (this.groupSaving || this.subGroupSaving) {
      return;
    }

    this.activeModal = null;
  }

  loadGroupManagement(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }

    this.groupService.getGroupManagement().subscribe({
      next: response => {
        this.loading = false;
        if (response.status && response.data) {
          this.groups = response.data.groups ?? [];
          this.subGroups = response.data.sub_groups ?? [];
        } else {
          this.groups = [];
          this.subGroups = [];
          this.errorMessage = response.message || 'Unable to load groups and subgroups.';
        }
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.groups = [];
        this.subGroups = [];
        this.errorMessage = error?.error?.message || 'Unable to load groups and subgroups.';
        this.cdr.detectChanges();
      }
    });
  }

  submitGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    const value = this.groupForm.getRawValue();
    const payload: CreateGroupRequest = {
      portal_name: value.portal_name.trim(),
      portal_url: value.portal_url.trim() || undefined,
      portal_image_path: value.portal_image_path.trim() || undefined,
      is_active: value.is_active
    };

    this.groupSaving = true;
    this.errorMessage = '';
    this.groupService.createGroup(payload).subscribe({
      next: response => {
        this.groupSaving = false;
        if (!response.status || !response.data) {
          this.errorMessage = response.message || 'Unable to create the group.';
          this.cdr.detectChanges();
          return;
        }

        this.successMessage = response.message || 'Group created successfully.';
        this.activeModal = null;
        this.cdr.detectChanges();
        this.loadGroupManagement(false);
      },
      error: error => {
        this.groupSaving = false;
        this.errorMessage = error?.error?.message || 'Unable to create the group.';
        this.cdr.detectChanges();
      }
    });
  }

  submitSubGroup(): void {
    if (this.subGroupForm.invalid) {
      this.subGroupForm.markAllAsTouched();
      return;
    }

    const value = this.subGroupForm.getRawValue();
    const payload: CreateSubGroupRequest = {
      portal_id: Number(value.portal_id),
      user_type_name: value.user_type_name.trim(),
      user_type_name_hn: value.user_type_name_hn.trim() || undefined,
      is_active: value.is_active
    };

    this.subGroupSaving = true;
    this.errorMessage = '';
    this.groupService.createSubGroup(payload).subscribe({
      next: response => {
        this.subGroupSaving = false;
        if (!response.status || !response.data) {
          this.errorMessage = response.message || 'Unable to create the subgroup.';
          this.cdr.detectChanges();
          return;
        }

        this.successMessage = response.message || 'Subgroup created successfully.';
        this.activeModal = null;
        this.cdr.detectChanges();
        this.loadGroupManagement(false);
      },
      error: error => {
        this.subGroupSaving = false;
        this.errorMessage = error?.error?.message || 'Unable to create the subgroup.';
        this.cdr.detectChanges();
      }
    });
  }

  dismissMessage(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  private resetGroupForm(): void {
    this.groupForm.reset({
      portal_name: '',
      portal_url: '',
      portal_image_path: '',
      is_active: 'Y'
    });
  }

  private resetSubGroupForm(): void {
    this.subGroupForm.reset({
      portal_id: null,
      user_type_name: '',
      user_type_name_hn: '',
      is_active: 'Y'
    });
  }
}
